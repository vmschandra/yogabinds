const { db } = require('./lib/firebase-admin');
const { generateInvoicePDF } = require('./lib/invoice-pdf');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { invoiceId } = req.query;

  if (!invoiceId) {
    return res.status(400).json({ error: 'Missing invoiceId parameter' });
  }

  try {
    // Fetch invoice from Firestore
    const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();

    if (!invoiceDoc.exists) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceDoc.data();

    // If we have a stored PDF, return it directly
    if (invoice.pdfBase64) {
      const pdfBuffer = Buffer.from(invoice.pdfBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      return res.status(200).send(pdfBuffer);
    }

    // Otherwise regenerate the PDF from stored data
    const pdfBuffer = await generateInvoicePDF(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    return res.status(500).json({ error: 'Failed to download invoice' });
  }
};
