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

async function createPassClass(req, res, next) {
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
      } catch (err) {
        console.error('Error creating class:', err.message);
        next(err);
      }
    } else {
      console.error('Error fetching class:', err.message);
      next(err);
    }
  }
}

async function createPassObject(studentId, studentName, admissionNo,studentClass,leavingDate, extParentId,parentId, parentName, parentNumber) {
  const studentIdStr = String(studentId);
  const objectSuffix = studentIdStr.replace(/[^\w.-]/g, '_');
  const objectId = `${issuerId}.${objectSuffix}`;
  const currentDate = new Date().toISOString();
  const passtoken = `${currentDate}-${studentId}`;
  console.log('Object ID:'+objectId);
  const genericObject = {
    "id": objectId,
    "classId": classId,
    "logo": {
      "sourceUri": {
    "uri": "https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg"
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
        "id": "class",
        "header": "CLASS",
        "body": studentClass,
      },
      {
        "id": "parent_id",
        "header": "PARENT ID",
        "body": extParentId,
      },
      {
        "id": "parent_name",
        "header": "PARENT NAME",
        "body": parentName,
      },
      {
        "id": "parent_number",
        "header": "MOBILE NUMBER",
        "body": parentNumber,
      },
    ],
    "barcode": {
      "type": "QR_CODE",
      "value": JSON.stringify({ studentId, parentId, passtoken }),
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
    const token = jwt.sign(claims, credentials.private_key, { algorithm: 'RS256' });
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;
    return { saveUrl, studentId,passtoken , parentId};
  } catch (err) {
    console.error('Error creating JWT token:', err.message);
    throw err;
  }
}

module.exports = {
  createPassClass,
  createPassObject
};
