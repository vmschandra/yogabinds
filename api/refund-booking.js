const Stripe = require('stripe');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
  var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
var db = admin.firestore();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var { bookingId, uid } = req.body;

  if (!bookingId || !uid) {
    return res.status(400).json({ error: 'Missing bookingId or uid' });
  }

  try {
    // Fetch the booking
    var bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    var booking = bookingDoc.data();

    // Verify the booking belongs to this user
    if (booking.uid !== uid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check 24-hour cancellation policy
    var classDates = booking.classDates || [];
    var now = new Date();
    var canCancel = false;

    for (var i = 0; i < classDates.length; i++) {
      var classStart = new Date(classDates[i] + 'T18:00:00');
      var cancelDeadline = new Date(classStart.getTime() - (24 * 60 * 60 * 1000));
      if (now < cancelDeadline) {
        canCancel = true;
        break;
      }
    }

    if (!canCancel) {
      return res.status(400).json({ error: 'Cancellation not allowed within 24 hours of class' });
    }

    // Find the payment intent from the invoice (linked by Stripe session)
    var paymentIntentId = booking.stripePaymentIntent || null;

    // If not on booking, try to find from invoices collection
    if (!paymentIntentId) {
      var invoiceQuery = await db.collection('invoices')
        .where('customerEmail', '==', booking.email || booking.customerEmail || '')
        .where('plan', '==', booking.plan || 'casual')
        .limit(1)
        .get();

      if (!invoiceQuery.empty) {
        paymentIntentId = invoiceQuery.docs[0].data().stripePaymentIntent;
      }
    }

    if (!paymentIntentId) {
      // No payment intent found — delete booking without refund (might be a guest/test booking)
      await db.collection('bookings').doc(bookingId).delete();
      console.log('Booking ' + bookingId + ' cancelled without refund (no payment intent found)');
      return res.status(200).json({ success: true, refunded: false, message: 'Booking cancelled. No payment record found for refund.' });
    }

    // Process refund via Stripe
    var stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    var refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer'
    });

    console.log('Refund created:', refund.id, 'for payment intent:', paymentIntentId);

    // Update booking status instead of deleting (keep record)
    await db.collection('bookings').doc(bookingId).update({
      status: 'cancelled',
      refundId: refund.id,
      refundStatus: refund.status,
      refundAmount: refund.amount / 100,
      cancelledAt: new Date().toISOString()
    });

    // Update the related invoice
    var invoiceQuery2 = await db.collection('invoices')
      .where('stripePaymentIntent', '==', paymentIntentId)
      .limit(1)
      .get();

    if (!invoiceQuery2.empty) {
      await invoiceQuery2.docs[0].ref.update({
        refundId: refund.id,
        refundStatus: refund.status,
        refundedAt: new Date().toISOString()
      });
    }

    console.log('Booking ' + bookingId + ' cancelled and refund processed: ' + refund.id);

    return res.status(200).json({
      success: true,
      refunded: true,
      refundId: refund.id,
      refundStatus: refund.status,
      message: 'Booking cancelled and refund of $' + (refund.amount / 100).toFixed(2) + ' AUD processed.'
    });

  } catch (error) {
    console.error('Refund error:', error.message, error.stack);
    return res.status(500).json({ error: 'Failed to process cancellation: ' + error.message });
  }
};
