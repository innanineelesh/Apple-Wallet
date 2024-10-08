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

// Helper function to replace null with "Not Available"
const replaceNullWithNA = (value) => value === null || value === undefined ? 'Not Available' : value;

// Create the pass class if it doesn't exist
async function createPassClass(req, res, next) {
  const genericClass = {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            threeItems: {
              startItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['admission_no']" }],
                },
              },
              middleItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['year_group']" }],
                },
              },
              endItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['class']" }],
                },
              },
            },
          },
          {
            twoItems: {
              startItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['parent_id']" }],
                },
              },
              endItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['parent_name']" }],
                },
              },
            },
          },
          {
            oneItem: {
              item: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['parent_number']" }],
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

// Create or update a Google Wallet pass
async function createPassObject(studentId, studentName, admissionNo, studentClass, leavingDate, extParentId, parentId, parentName, parentNumber) {
  const objectSuffix = String(studentId).replace(/[^\w.-]/g, '_');
  const objectId = `${issuerId}.${objectSuffix}`;
  const currentDate = new Date().toISOString();
  const passtoken = `${currentDate}-${studentId}`;
  const serialNumber = `${studentId}-${parentId}`;

  const genericObject = {
    id: objectId,
    classId: classId,
    logo: {
      sourceUri: {
        uri: "https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg",
      },
      contentDescription: {
        defaultValue: {
          language: "en-US",
          value: "LOGO_IMAGE_DESCRIPTION",
        },
      },
    },
    cardTitle: {
      defaultValue: {
        language: "en-US",
        value: "SRS STUDENT PASS",
      },
    },
    header: {
      defaultValue: {
        language: "en-US",
        value: replaceNullWithNA(studentName),
      },
    },
    textModulesData: [
      { id: "admission_no", header: "ADMISSION NO", body: replaceNullWithNA(admissionNo) },
      { id: "year_group", header: "LEAVING DATE", body: replaceNullWithNA(leavingDate) },
      { id: "class", header: "CLASS", body: replaceNullWithNA(studentClass) },
      { id: "parent_id", header: "PARENT ID", body: replaceNullWithNA(extParentId) },
      { id: "parent_name", header: "PARENT NAME", body: replaceNullWithNA(parentName) },
      { id: "parent_number", header: "MOBILE NUMBER", body: replaceNullWithNA(parentNumber) },
    ],
    barcode: {
      type: "QR_CODE",
      value: JSON.stringify({ 
        admissionNo: replaceNullWithNA(admissionNo),
        studentId: replaceNullWithNA(studentId), 
        parentId: replaceNullWithNA(parentId), 
        passtoken: replaceNullWithNA(passtoken), 
        studentName: replaceNullWithNA(studentName), 
        studentClass: replaceNullWithNA(studentClass), 
        leavingDate: replaceNullWithNA(leavingDate), 
        extParentId: replaceNullWithNA(extParentId), 
        parentName: replaceNullWithNA(parentName), 
        parentNumber: replaceNullWithNA(parentNumber) 
      }),
    },
    hexBackgroundColor: "#ff914d",
    serialNumber: serialNumber
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
    console.log('Pass Token:', passtoken);
    return { saveUrl, studentId, passtoken, parentId };
  } catch (err) {
    console.error('Error creating JWT token:', err.message);
    throw err;
  }
}

module.exports = {
  createPassClass,
  createPassObject
};
