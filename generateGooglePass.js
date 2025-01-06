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
        "uri": "data:image/jpeg;base64,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",
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
