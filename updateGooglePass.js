const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

const serviceAccountBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64_1;
const serviceAccountRaw = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
const credentials = JSON.parse(serviceAccountRaw);

const issuerId = '3388000000022354783';
const baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';

const auth = new GoogleAuth({
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
  scopes: 'https://www.googleapis.com/auth/wallet_object.issuer',
});

async function updateGooglePass(req, res) {
  const { studentId, newToken } = req.body; // Get studentId and new token from the request body
  const studentIdStr = String(studentId);
  const objectSuffix = studentIdStr.replace(/[^\w.-]/g, '_'); // Ensure the object ID is URL-safe
  const objectId = `${issuerId}.${objectSuffix}`; // Generate the object ID based on issuer ID and student ID
  
  const patchPayload = {
    textModulesData: [
      {
        id: 'passtoken',
        header: 'Pass Token',
        body: newToken, // Update the pass token with the new value
      },
    ],
  };

  try {
    // Make a PATCH request to update the Google Wallet object
    const response = await auth.request({
      url: `${baseUrl}/genericObject/${objectId}`, // URL to the specific pass object
      method: 'PATCH',
      data: patchPayload, // Data to patch the pass object
    });

    console.log('Google Pass Updated:', response.data);
    res.status(200).send('Google Pass successfully updated');
  } catch (error) {
    console.error('Error updating Google Pass:', error.message);
    res.status(500).send('Failed to update Google Pass');
  }
}

module.exports = updateGooglePass;
