const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const serviceAccountBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64_1;
const serviceAccountRaw = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
const credentials = JSON.parse(serviceAccountRaw);

const issuerId = '3388000000022354783';
const classId = `${issuerId}.StudentPass`;
const baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';

const auth = new GoogleAuth({
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
  scopes: 'https://www.googleapis.com/auth/wallet_object.issuer',
});

// Create the pass class if it doesn't already exist
async function createPassClass() {
    const genericClass = {
        "id": classId,
        "classTemplateInfo": {
            "cardTemplateOverride": {
                "cardRowTemplateInfos": [{
                    "twoItems": {
                        "startItem": { "firstValue": { "fields": [{ "fieldPath": "object.textModulesData['admission_no'].body" }] }},
                        "endItem": { "firstValue": { "fields": [{ "fieldPath": "object.textModulesData['parent_name'].body" }] }}
                    }
                }]
            }
        }
    };

    try {
        await auth.request({
            url: `${baseUrl}/genericClass/${classId}`,
            method: 'GET'
        });
    } catch (err) {
        if (err.response && err.response.status === 404) {
            await auth.request({
                url: `${baseUrl}/genericClass`,
                method: 'POST',
                data: genericClass
            });
        } else {
            console.error('Error fetching class:', err.message);
            throw err;
        }
    }
}

// Create or update a Google Wallet pass based on the serial number
async function createOrUpdatePass(studentId, studentName, admissionNo, studentClass, leavingDate, extParentId, parentId, parentName, parentNumber) {
    const objectSuffix = String(studentId).replace(/[^\w.-]/g, '_');
    const objectId = `${issuerId}.${objectSuffix}`;
    const passtoken = `${new Date().toISOString()}-${studentId}`;
    const serialNumber = `${studentId}-${parentId}`;
    const genericObject = {
        "id": objectId,
        "classId": classId,
        "logo": {
            "sourceUri": {
                "uri": "https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg",
            },
        },
        "cardTitle": {
            "defaultValue": {
                "language": "en-US",
                "value": "SRS STUDENT PASS",
            },
        },
        "header": {
            "defaultValue": {
                "language": "en-US",
                "value": studentName,
            },
        },
        "textModulesData": [
            { "id": "admission_no", "header": "ADMISSION NO", "body": admissionNo },
            { "id": "year_group", "header": "LEAVING DATE", "body": leavingDate },
            { "id": "class", "header": "CLASS", "body": studentClass },
            { "id": "parent_id", "header": "PARENT ID", "body": extParentId },
            { "id": "parent_name", "header": "PARENT NAME", "body": parentName },
            { "id": "parent_number", "header": "MOBILE NUMBER", "body": parentNumber }
        ],
        "barcode": {
            "type": "QR_CODE",
            "value": JSON.stringify({ admissionNo, studentId, parentId, passtoken, studentName, studentClass, leavingDate, extParentId, parentName, parentNumber }),
        },
        "hexBackgroundColor": "#ff914d",
        "serialNumber": serialNumber
    };

    try {
        const accessToken = await auth.getAccessToken();

        // Check if the pass exists
        try {
            await axios.get(`${baseUrl}/genericObject/${objectId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // If it exists, update the pass using PATCH
            await axios.patch(`${baseUrl}/genericObject/${objectId}`, genericObject, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Pass updated successfully.');
        } catch (err) {
            if (err.response && err.response.status === 404) {
                // If the pass doesn't exist, create it using POST
                await axios.post(`${baseUrl}/genericObject`, genericObject, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Pass created successfully.');
            } else {
                console.error('Error fetching pass:', err.message);
                throw err;
            }
        }

        // Generate JWT to create a save URL
        const claims = {
            iss: credentials.client_email,
            aud: 'google',
            typ: 'savetowallet',
            payload: {
                genericObjects: [genericObject]
            }
        };

        const token = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });
        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        return { saveUrl, serialNumber };

    } catch (err) {
        console.error('Error in pass operation:', err.message);
        throw err;
    }
}

module.exports = {
    createOrUpdatePass,
    createPassClass
};
