const QRCode = require('qrcode');

/**
 * QR Code generation service
 * Handles creation of QR code images for payment
 */

/**
 * Generate QR code as buffer
 * @param {string} text - Text to encode in QR code
 * @returns {Promise<Buffer>} QR code image as buffer
 */
async function generateQRCode(text) {
  try {
    return await QRCode.toBuffer(text, { 
      type: 'png', 
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M'
    });
  } catch (error) {
    console.error('QR Code Generation Error:', error);
    throw new Error('Failed to generate QR code');
  }
}

module.exports = {
  generateQRCode
};
