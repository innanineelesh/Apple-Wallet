const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const serviceAccountBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
const serviceAccountRaw = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
const credentials = JSON.parse(serviceAccountRaw);

const issuerId = '3388000000022351279';
const classId = `${issuerId}.studentPass`;
const baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';

const auth = new GoogleAuth({
  credentials: {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  },
  scopes: 'https://www.googleapis.com/auth/wallet_object.issuer'
});

async function createPassClass(req, res) {
  const genericClass = {
    "id": classId,
    "classTemplateInfo": {
      "cardTemplateOverride": {
        "cardRowTemplateInfos": [
          {
            "threeItems": {
              "startItem": {
                "firstValue": {
                  "fields": [
                    {
                      "fieldPath": "object.textModulesData['admission_no']",
                    },
                  ],
                },
              },
              "middleItem": {
                "firstValue": {
                  "fields": [
                    {
                      "fieldPath": "object.textModulesData['year_group']",
                    },
                  ],
                },
              },
              "endItem": {
                "firstValue": {
                  "fields": [
                    {
                      "fieldPath": "object.textModulesData['class']",
                    },
                  ],
                },
              },
            },
          },
          {
            "twoItems": {
              "startItem": {
                "firstValue": {
                  "fields": [
                    {
                      "fieldPath": "object.textModulesData['parent_id']",
                    },
                  ],
                },
              },
              "endItem": {
                "firstValue": {
                  "fields": [
                    {
                      "fieldPath": "object.textModulesData['parent_name']",
                    },
                  ],
                },
              },
            },
          },
          {
            "oneItem": {
              "item": {
                "firstValue": {
                  "fields": [
                    {
                      "fieldPath": "object.textModulesData['parent_number']",
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  };

  try {
    await auth.request({
      url: `${baseUrl}/genericClass/${classId}`,
      method: 'GET'
    });
  } catch (err) {
    if (err.response && err.response.status === 404) {
      try {
        await auth.request({
          url: `${baseUrl}/genericClass`,
          method: 'POST',
          data: genericClass
        });
        res.status(200).send('Class created successfully.');
      } catch (err) {
        console.error('Error creating class:', err.message);
        res.status(500).send('Error creating class');
      }
    } else {
      console.error('Error fetching class:', err.message);
      res.status(500).send('Error fetching class');
    }
  }
}

async function createPassObject(req, res) {
  const { studentId, studentName, admissionNo, studentYearGroup, studentClass, parentId, parentName, parentNumber } = req.body;
  
  if (!studentId || !studentName || !admissionNo || !studentYearGroup || !studentClass || !parentId || !parentName || !parentNumber) {
    return res.status(400).send('Missing required fields.');
  }

  const objectSuffix = studentId.replace(/[^\w.-]/g, '_');
  const objectId = `${issuerId}.${objectSuffix}`;

  const currentDate = new Date().toISOString();
  const token = `${currentDate}-${studentId}`;

  const genericObject = {
    "id": objectId,
    "classId": classId,
    "logo": {
      "sourceUri": {
        "uri": "https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg",
      },
      "contentDescription": {
        "defaultValue": {
          "language": "en-US",
          "value": "LOGO_IMAGE_DESCRIPTION",
        },
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
      {
        "id": "admission_no",
        "header": "ADMISSION NO",
        "body": admissionNo,
      },
      {
        "id": "year_group",
        "header": "YEAR GROUP",
        "body": studentYearGroup,
      },
      {
        "id": "class",
        "header": "CLASS",
        "body": studentClass,
      },
      {
        "id": "parent_id",
        "header": "PARENT ID",
        "body": parentId,
      },
      {
        "id": "parent_name",
        "header": "PARENT NAME",
        "body": parentName,
      },
      {
        "id": "parent_number",
        "header": "PARENT NUMBER",
        "body": parentNumber,
      },
    ],
    "barcode": {
      "type": "QR_CODE",
      "value": JSON.stringify({ admissionNo, studentId, parentId, token }),
      "alternateText": "",
    },
    "hexBackgroundColor": "#ff914d",
  };

  const claims = {
    iss: credentials.client_email,
    aud: 'google',
    typ: 'savetowallet',
    payload: {
      genericObjects: [genericObject]
    }
  };

  try {
    const jwtToken = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });
    const saveUrl = `https://pay.google.com/gp/v/save/${jwtToken}`;
    res.status(200).json({ saveUrl, token });
  } catch (err) {
    console.error('Error creating JWT token:', err.message);
    res.status(500).send('Error creating pass object');
  }
}

module.exports = {
  createPassClass,
  createPassObject
};
