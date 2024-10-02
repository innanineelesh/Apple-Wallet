const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

const serviceAccountBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64_1;
const serviceAccountRaw = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
const credentials = JSON.parse(serviceAccountRaw);

const issuerId = '3388000000022354783'; // Your issuer ID
const baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1'; // Base URL for Google Wallet API

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

    // Log the successful response
    console.log('Google Pass Updated:', response.data);

    // Send a success response to the client
    res.status(200).json({
      message: 'Google Pass successfully updated',
      data: response.data, // Optional: include response data if needed
    });
  } catch (error) {
    // Enhanced error handling
    console.error('Error updating Google Pass:', error.message);
    
    // Check if the error response is available
    if (error.response) {
      console.error('Error response data:', error.response.data);
      res.status(error.response.status).send(error.response.data); // Send the specific error message from Google API
    } else {
      res.status(500).send('Failed to update Google Pass');
    }
  }
}

module.exports = updateGooglePass;
