const PDFDocument = require('pdfkit');

/**
 * Generate a professional invoice PDF and return it as a Buffer.
 *
 * @param {Object} invoice - Invoice data
 * @param {string} invoice.invoiceNumber - e.g. "YBIN-001"
 * @param {string} invoice.invoiceDate - e.g. "3 April 2026"
 * @param {string} invoice.customerName
 * @param {string} invoice.customerEmail
 * @param {string} invoice.description - e.g. "Yoga Session — Casual Class"
 * @param {number} invoice.amount - e.g. 15.99
 * @param {string} invoice.classDates - e.g. "10 Apr 2026, 17 Apr 2026"
 * @param {string} [invoice.abn] - Optional ABN
 * @returns {Promise<Buffer>}
 */
function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${invoice.invoiceNumber}`,
          Author: 'YogaBinds'
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const green = '#2d5e3f';
      const darkText = '#1a1a1a';
      const mutedText = '#666666';
      const lineColor = '#e0e0e0';

      // ── Header ──
      doc.fontSize(28).fillColor(green).font('Helvetica-Bold').text('YogaBinds', 50, 50);
      doc.fontSize(9).fillColor(mutedText).font('Helvetica')
        .text('A yoga studio rooted in ancient tradition', 50, 82);

      // Invoice title - right aligned
      doc.fontSize(20).fillColor(darkText).font('Helvetica-Bold')
        .text('TAX INVOICE', 350, 50, { width: 195, align: 'right' });

      // Divider
      doc.moveTo(50, 110).lineTo(545, 110).strokeColor(green).lineWidth(2).stroke();

      // ── Invoice details (left) & Business details (right) ──
      let y = 130;

      // Left column - Invoice details
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('Invoice Number', 50, y);
      doc.fontSize(10).fillColor(darkText).font('Helvetica-Bold').text(invoice.invoiceNumber, 50, y + 14);

      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('Invoice Date', 50, y + 38);
      doc.fontSize(10).fillColor(darkText).font('Helvetica').text(invoice.invoiceDate, 50, y + 52);

      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('Payment Method', 50, y + 76);
      doc.fontSize(10).fillColor(darkText).font('Helvetica').text('Stripe (Card)', 50, y + 90);

      // Right column - Business details
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('From', 350, y, { width: 195, align: 'right' });
      doc.fontSize(10).fillColor(darkText).font('Helvetica-Bold').text('YogaBinds', 350, y + 14, { width: 195, align: 'right' });
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('Sydney, Australia', 350, y + 30, { width: 195, align: 'right' });
      doc.text('yogabinds26@gmail.com', 350, y + 44, { width: 195, align: 'right' });
      if (invoice.abn) {
        doc.text('ABN: ' + invoice.abn, 350, y + 58, { width: 195, align: 'right' });
      }

      // ── Bill To ──
      y = 270;
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text('Bill To', 50, y);
      doc.fontSize(10).fillColor(darkText).font('Helvetica-Bold').text(invoice.customerName, 50, y + 14);
      doc.fontSize(9).fillColor(mutedText).font('Helvetica').text(invoice.customerEmail, 50, y + 30);

      // ── Line Items Table ──
      y = 340;

      // Table header background
      doc.rect(50, y, 495, 28).fillColor('#f5f5f5').fill();

      // Table header text
      doc.fontSize(9).fillColor(mutedText).font('Helvetica-Bold');
      doc.text('Description', 60, y + 8, { width: 240 });
      doc.text('Qty', 310, y + 8, { width: 50, align: 'center' });
      doc.text('Unit Price', 370, y + 8, { width: 80, align: 'right' });
      doc.text('Amount', 460, y + 8, { width: 75, align: 'right' });

      // Table row
      y += 28;
      doc.moveTo(50, y).lineTo(545, y).strokeColor(lineColor).lineWidth(0.5).stroke();

      y += 10;
      doc.fontSize(10).fillColor(darkText).font('Helvetica');
      doc.text(invoice.description, 60, y, { width: 240 });

      // Class dates below description
      if (invoice.classDates) {
        doc.fontSize(8).fillColor(mutedText).text('Class dates: ' + invoice.classDates, 60, y + 16, { width: 240 });
      }

      doc.fontSize(10).fillColor(darkText);
      doc.text('1', 310, y, { width: 50, align: 'center' });
      doc.text('$' + invoice.amount.toFixed(2), 370, y, { width: 80, align: 'right' });
      doc.text('$' + invoice.amount.toFixed(2), 460, y, { width: 75, align: 'right' });

      // Bottom line
      y += (invoice.classDates ? 38 : 24);
      doc.moveTo(50, y).lineTo(545, y).strokeColor(lineColor).lineWidth(0.5).stroke();

      // ── Totals ──
      y += 16;
      doc.fontSize(10).fillColor(mutedText).font('Helvetica');
      doc.text('Subtotal', 370, y, { width: 80, align: 'right' });
      doc.fillColor(darkText).text('$' + invoice.amount.toFixed(2), 460, y, { width: 75, align: 'right' });

      y += 22;
      doc.fillColor(mutedText).text('GST', 370, y, { width: 80, align: 'right' });
      doc.fillColor(darkText).text('$0.00', 460, y, { width: 75, align: 'right' });

      y += 22;
      doc.moveTo(370, y).lineTo(545, y).strokeColor(lineColor).lineWidth(0.5).stroke();

      y += 10;
      doc.fontSize(13).fillColor(green).font('Helvetica-Bold');
      doc.text('Total Paid', 350, y, { width: 100, align: 'right' });
      doc.text('$' + invoice.amount.toFixed(2) + ' AUD', 460, y, { width: 75, align: 'right' });

      // ── GST Note ──
      y += 50;
      doc.rect(50, y, 495, 36).fillColor('#f9f9f2').fill();
      doc.fontSize(9).fillColor(mutedText).font('Helvetica')
        .text('No GST has been charged as the business is not registered for GST.', 60, y + 12, { width: 475 });

      // ── Footer ──
      const footerY = 720;
      doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(lineColor).lineWidth(0.5).stroke();

      doc.fontSize(8).fillColor(mutedText).font('Helvetica');
      doc.text('Thank you for choosing YogaBinds. Namaste.', 50, footerY + 12);
      doc.text('yogabinds26@gmail.com | Sydney, Australia', 50, footerY + 24);
      doc.text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 36);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePDF };
