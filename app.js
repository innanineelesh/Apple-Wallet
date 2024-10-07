const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios'); // Add axios require
const generateApplePass = require('./generateApplePass');
const generateGooglePass = require('./generateGooglePass');
const updateGooglePass = require('./updateGooglePass');
const updateApplePass = require('./updateApplePass');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
async function getPublicIP() {
  try {
    const response = await axios.get('https://ifconfig.me');
    console.log('Public IP Address:', response.data);
  } catch (error) {
    console.error('Error fetching public IP:', error);
  }
}



const SALESFORCE_TOKEN_URL = 'https://test.salesforce.com/services/oauth2/token';
const SALESFORCE_API_URL = 'https://schoolofresearchscience--conxdev.sandbox.lightning.force.com/services/data/v58.0/';
const SALESFORCE_OBJECT_NAME = 'Student_Wallet_Pass__c';

async function getAccessToken() {
    try {
        const response = await axios.post(SALESFORCE_TOKEN_URL, null, {
            params: {
                grant_type: 'password',
                client_id: '3MVG9OjW2TAjFKUsXpXOE8dosccPowv1o6XYEqy8YOmabzgx5URwiuUIFHrTnjiZADbn74bHwNSI1np17IVYK',
                client_secret: 'EF15B13CCBB7A7060D7F1B18D7DDB5F61A2AF8E80A06B92C754B883BB5CF83D2',
                username: 'kishan@conx.digital.srs.conxdev',
                password: 'HelloConX1',
            },
        });

        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        throw new Error('Unable to retrieve Salesforce access token');
    }
}

app.post(
  "/:version/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber",
  async (req, res) => {
      try {
          const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;
          const { pushToken } = req.body;

          console.log('Device registered for pass updates:', { deviceLibraryIdentifier, passTypeIdentifier, serialNumber, pushToken });
          const SALESFORCE_ACCESS_TOKEN = await getAccessToken();
          const [studentId, parentId] = serialNumber.split('-');
          console.log("Access Token", +SALESFORCE_ACCESS_TOKEN);
          const query = `SELECT Id FROM ${SALESFORCE_OBJECT_NAME} WHERE student__c = '${studentId}' AND parent__c = '${parentId}' LIMIT 1`;
          const queryUrl = `${SALESFORCE_API_URL}query?q=${encodeURIComponent(query)}`;
          
          const queryResponse = await axios.get(queryUrl, {
              headers: {
                  'Authorization': `Bearer ${SALESFORCE_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json'
              }
          });

          // Check if we found a record
          const records = queryResponse.data.records;
          if (records.length === 0) {
              return res.status(404).send('No record found for the given student and parent combination');
          }

          const salesforceRecordId = records[0].Id;

          // Step 3: Update the Salesforce record with pushToken
          const salesforceUpdateUrl = `${SALESFORCE_API_URL}sobjects/${SALESFORCE_OBJECT_NAME}/${salesforceRecordId}`;
          const updateData = {
              Push_Token__c: pushToken,
              Device_Library_Identifier__c: deviceLibraryIdentifier // Adjust the field name as necessary
          };

          // Send update request to Salesforce
          await axios.patch(salesforceUpdateUrl, updateData, {
              headers: {
                  'Authorization': `Bearer ${SALESFORCE_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json'
              }
          });

          res.status(201).send('Device successfully registered for pass updates');
  
      } catch (error) {
          console.error('Error during device registration:', error);
          res.status(500).send('Error registering device');
      }
  }
);

app.post('/generateApplePass', generateApplePass);

app.post('/generateGooglePass', async (req, res) => {
getPublicIP();
    try {
        await generateGooglePass.createPassClass();

        const { studentId, studentName, admissionNo, studentClass, leavingDate, extParentId, parentId, parentName, parentNumber } = req.body;

        // Create or update the Google pass
        const { saveUrl, passtoken } = await generateGooglePass.createOrUpdatePass(
            studentId,
            studentName,
            admissionNo,
            studentClass,
            leavingDate,
            extParentId,
            parentId,
            parentName,
            parentNumber
        );

        res.json({ saveUrl, token: passtoken });
    } catch (err) {
        console.error('Error creating/updating Google pass:', err);
        res.status(500).send('Error creating/updating Google pass');
    }
});

app.patch('/updateGooglePass', updateGooglePass);

app.post('/updateApplePass', updateApplePass);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
