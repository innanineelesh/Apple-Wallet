const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios'); 
const generateApplePass = require('./generateApplePass');
const generateGooglePass = require('./generateGooglePass');
const updateGooglePass = require('./updateGooglePass');
const updateApplePass = require('./updateApplePass');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let isRequestInProgress = false; // Declare this variable
let cachedAccessToken = null;
let tokenExpiryTime = null;

const SALESFORCE_TOKEN_URL = 'https://test.salesforce.com/services/oauth2/token';
const SALESFORCE_API_URL = 'https://schoolofresearchscience--conxdev.sandbox.lightning.force.com/services/data/v58.0/';
const SALESFORCE_OBJECT_NAME = 'Student_Wallet_Pass__c';

async function getAccessToken() {
    if (cachedAccessToken && tokenExpiryTime > Date.now()) {
        return cachedAccessToken; 
    }

    try {
        console.log('Requesting Salesforce access token...');
        const response = await axios.post(SALESFORCE_TOKEN_URL, null, {
            params: {
                grant_type: 'password',
                client_id: '3MVG9OjW2TAjFKUsXpXOE8doscdtnO4mYBV3RRiYfnwi.4iz.r7QlHznmMfrZIisW66Rhh2LF11GPrraR57_i',
                client_secret: '3B77EA503435EFA5B6C5CA0D2AA6166CB5C69735848D47CD1D367270BB8F2C8C',
                username: 'neelesh@conx.digital1',
                password: '1455@Neel',
            },
        });

        cachedAccessToken = response.data.access_token;
        tokenExpiryTime = Date.now() + (response.data.expires_in * 1000); 
        console.log('Access token received:', cachedAccessToken);
        return cachedAccessToken;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        throw new Error('Unable to retrieve Salesforce access token');
    }
}

app.post(
    "/:version/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber",
    async (req, res) => {
        if (isRequestInProgress) {
            return res.status(429).send('Request already in progress'); 
        }
        isRequestInProgress = true;

        try {
            const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;
            const { pushToken } = req.body;

            console.log('Device registered for pass updates:', { deviceLibraryIdentifier, passTypeIdentifier, serialNumber, pushToken });
            
            const SALESFORCE_ACCESS_TOKEN = await getAccessToken();
            const [studentId, parentId] = serialNumber.split('-');
            console.log("Split Serial Number into Student ID and Parent ID:", { studentId, parentId });
            
            const query = `SELECT+Id+FROM+${SALESFORCE_OBJECT_NAME}+WHERE+student__c='${studentId}'+AND+parent__c='${parentId}'+LIMIT+1`;;
            console.log('Constructed SOQL Query:', query);
            
            const queryUrl = `${SALESFORCE_API_URL}query?q=${encodeURIComponent(query)}`;
            console.log('Query URL:', queryUrl);
            
            const queryResponse = await axios.get(queryUrl, {
                headers: {
                    'Authorization': `Bearer ${SALESFORCE_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Query Response:', queryResponse.data);
            const records = queryResponse.data.records;
            if (!records || records.length === 0) {
                console.log('No records found for the given student and parent combination.');
                return res.status(404).send('No record found for the given student and parent combination');
            }

            const salesforceRecordId = records[0].Id;
            console.log('Salesforce Record ID:', salesforceRecordId);

            const salesforceUpdateUrl = `${SALESFORCE_API_URL}sobjects/${SALESFORCE_OBJECT_NAME}/${salesforceRecordId}`;
            const updateData = {
                Push_Token__c: pushToken,
                Device_Library_Identifier__c: deviceLibraryIdentifier
            };

            console.log('Updating Salesforce Record with data:', updateData);
            await axios.patch(salesforceUpdateUrl, updateData, {
                headers: {
                    'Authorization': `Bearer ${SALESFORCE_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Device successfully registered for pass updates.');
            res.status(201).send('Device successfully registered for pass updates');

        } catch (error) {
            console.error('Error during device registration:', error);
            res.status(500).send('Error registering device');
        } finally {
            isRequestInProgress = false; 
        }
    }
);

app.post('/generateApplePass', (req, res) => {
    console.log('Generating Apple Pass...');
    generateApplePass(req, res);
});

app.post('/generateGooglePass', async (req, res) => {
    console.log('Generating Google Pass...');
    await getPublicIP();
    
    try {
        await generateGooglePass.createPassClass();
        console.log('Pass class created.');

        const { studentId, studentName, admissionNo, studentClass, leavingDate, extParentId, parentId, parentName, parentNumber } = req.body;
        console.log('Google Pass Data:', { studentId, studentName, admissionNo, studentClass, leavingDate, extParentId, parentId, parentName, parentNumber });

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

        console.log('Google Pass created/updated successfully:', { saveUrl, passtoken });
        res.json({ saveUrl, token: passtoken });
    } catch (err) {
        console.error('Error creating/updating Google pass:', err);
        res.status(500).send('Error creating/updating Google pass');
    }
});

app.patch('/updateGooglePass', (req, res) => {
    console.log('Updating Google Pass...');
    updateGooglePass(req, res);
});

app.post('/updateApplePass', (req, res) => {
    console.log('Updating Apple Pass...');
    updateApplePass(req, res);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
