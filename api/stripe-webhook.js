const Stripe = require('stripe');
const { Resend } = require('resend');
const { db } = require('./lib/firebase-admin');
const { generateInvoicePDF } = require('./lib/invoice-pdf');

// Read raw body from the request stream
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Log env check (will appear in Vercel logs)
  console.log('Webhook called. Has STRIPE_SECRET_KEY:', !!process.env.STRIPE_SECRET_KEY);
  console.log('Has STRIPE_WEBHOOK_SECRET:', !!process.env.STRIPE_WEBHOOK_SECRET);
  console.log('Has FIREBASE_SERVICE_ACCOUNT:', !!process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log('Has RESEND_API_KEY:', !!process.env.RESEND_API_KEY);

  let event;

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];

    console.log('Raw body length:', rawBody.length);
    console.log('Has stripe-signature:', !!sig);

    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed: ' + err.message });
  }

  console.log('Event type:', event.type);

  // Only process successful checkout sessions
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      await handleSuccessfulPayment(session);
      console.log('Invoice processed successfully for session:', session.id);
    } catch (err) {
      console.error('Error processing invoice:', err.message, err.stack);
    }
  }

  // Acknowledge receipt to Stripe
  return res.status(200).json({ received: true });
}

async function handleSuccessfulPayment(session) {
  const customerName = session.metadata.fullName || 'Customer';
  const customerEmail = session.customer_email || session.customer_details?.email;
  const plan = session.metadata.plan || 'casual';
  const phone = session.metadata.phone || '';
  let classDates = '';

  try {
    const parsed = JSON.parse(session.metadata.classDates || '[]');
    classDates = parsed.map(d => {
      const date = new Date(d + 'T00:00:00');
      return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    }).join(', ');
  } catch (e) {
    classDates = '';
  }

  const amount = session.amount_total / 100;
  const description = plan === 'casual'
    ? 'Yoga Session — Casual Class'
    : 'Yoga Sessions — Introductory Offer (3 Classes)';

  // Generate auto-incremented invoice number using Firestore transaction
  const counterRef = db.collection('counters').doc('invoices');
  const invoiceNumber = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextNumber = 1;
    if (counterDoc.exists) {
      nextNumber = (counterDoc.data().lastNumber || 0) + 1;
    }
    transaction.set(counterRef, { lastNumber: nextNumber });
    return 'YBIN-' + String(nextNumber).padStart(3, '0');
  });

  const invoiceDate = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const invoiceData = {
    invoiceNumber,
    invoiceDate,
    customerName,
    customerEmail,
    phone,
    description,
    amount,
    classDates,
    plan,
    abn: process.env.BUSINESS_ABN || '',
    stripeSessionId: session.id,
    stripePaymentIntent: session.payment_intent,
    createdAt: new Date().toISOString()
  };

  // Generate the PDF
  const pdfBuffer = await generateInvoicePDF(invoiceData);

  // Store invoice record in Firestore
  await db.collection('invoices').add({
    ...invoiceData,
    pdfBase64: pdfBuffer.toString('base64'),
    emailSent: false
  });

  console.log(`Invoice ${invoiceNumber} saved to Firestore for ${customerEmail}`);

  // Send invoice email to customer (non-fatal if it fails)
  try {
    await sendInvoiceEmail(customerEmail, customerName, invoiceNumber, pdfBuffer);

    const invoiceQuery = await db.collection('invoices')
      .where('invoiceNumber', '==', invoiceNumber)
      .limit(1)
      .get();

    if (!invoiceQuery.empty) {
      await invoiceQuery.docs[0].ref.update({ emailSent: true });
    }

    console.log(`Invoice ${invoiceNumber} emailed to ${customerEmail}`);
  } catch (emailErr) {
    console.error(`Failed to email invoice ${invoiceNumber}:`, emailErr.message);
  }
}

async function sendInvoiceEmail(email, name, invoiceNumber, pdfBuffer) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'YogaBinds <onboarding@resend.dev>',
    to: [email],
    subject: `Your YogaBinds Invoice — ${invoiceNumber}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #333;">
        <h2 style="color: #2d5e3f; margin-bottom: 4px;">YogaBinds</h2>
        <p style="color: #999; font-size: 13px; margin-top: 0;">A yoga studio rooted in ancient tradition</p>
        <hr style="border: none; border-top: 2px solid #2d5e3f; margin: 24px 0;" />
        <p>Hi ${name},</p>
        <p>Thank you for your booking! Please find your invoice <strong>${invoiceNumber}</strong> attached to this email.</p>
        <p>Your payment has been received and processed successfully via Stripe.</p>
        <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
          <tr style="background: #f5f5f5;">
            <td style="padding: 10px 12px; font-size: 13px; color: #666;">Invoice Number</td>
            <td style="padding: 10px 12px; font-size: 13px; font-weight: bold; text-align: right;">${invoiceNumber}</td>
          </tr>
        </table>
        <p>You can also download your invoice anytime from the <strong>My Bookings</strong> page on our website.</p>
        <p style="margin-top: 32px;">Namaste,<br/><strong style="color: #2d5e3f;">YogaBinds</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
        <p style="font-size: 11px; color: #999;">
          This is an automated email from YogaBinds. If you have any questions, please contact us at yogabinds26@gmail.com.
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer.toString('base64'),
        contentType: 'application/pdf'
      }
    ]
  });
}

// Export handler FIRST, then attach config
// This order is critical — otherwise config gets wiped
module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false
  }
};
