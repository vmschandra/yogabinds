const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var invoiceId = req.query.invoiceId;
  if (!invoiceId) {
    return res.status(400).json({ error: 'Missing invoiceId parameter' });
  }

  try {
    var invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
    if (!invoiceDoc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    var invoice = invoiceDoc.data();
    if (invoice.pdfBase64) {
      var pdfBuffer = Buffer.from(invoice.pdfBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="' + invoice.invoiceNumber + '.pdf"');
      return res.status(200).send(pdfBuffer);
    }

    return res.status(404).json({ error: 'PDF not available' });
  } catch (error) {
    console.error('Error downloading invoice:', error);
    return res.status(500).json({ error: 'Failed to download invoice' });
  }
};
