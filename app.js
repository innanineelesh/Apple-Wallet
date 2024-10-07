const express = require('express');
const bodyParser = require('body-parser');
const jsforce = require('jsforce'); // Include jsforce
const generateApplePass = require('./generateApplePass');
const generateGooglePass = require('./generateGooglePass');
const updateGooglePass = require('./updateGooglePass');
const updateApplePass = require('./updateApplePass');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Initialize Jsforce connection
const conn = new jsforce.Connection({
    loginUrl: 'https://test.salesforce.com'
});

async function getAccessToken() {
    try {
        console.log('Requesting Salesforce access token...');
        await conn.login('neelesh@conx.digital1', '1455@Neel', {
            clientId: '3MVG9OjW2TAjFKUsXpXOE8doscdtnO4mYBV3RRiYfnwi.4iz.r7QlHznmMfrZIisW66Rhh2LF11GPrraR57_i',
            clientSecret: '3B77EA503435EFA5B6C5CA0D2AA6166CB5C69735848D47CD1D367270BB8F2C8C'
        });
        console.log('Access token received:', conn.accessToken);
    } catch (error) {
        console.error('Error fetching access token:', error);
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

            await getAccessToken(); // Ensure we're authenticated

            const [studentId, parentId] = serialNumber.split('-');
            console.log("Split Serial Number into Student ID and Parent ID:", { studentId, parentId });

            const query = `SELECT Id FROM Student_Wallet_Pass__c WHERE student__c='${studentId}' AND parent__c='${parentId}' LIMIT 1`;
            console.log('Constructed SOQL Query:', query);

            const queryResponse = await conn.query(query);
            console.log('Query Response:', queryResponse);

            if (!queryResponse.records || queryResponse.records.length === 0) {
                console.log('No records found for the given student and parent combination.');
                return res.status(404).send('No record found for the given student and parent combination');
            }

            const salesforceRecordId = queryResponse.records[0].Id;
            console.log('Salesforce Record ID:', salesforceRecordId);

            // Step 3: Update the Salesforce record with pushToken
            const updateData = {
                Push_Token__c: pushToken,
                Device_Library_Identifier__c: deviceLibraryIdentifier // Adjust the field name as necessary
            };

            console.log('Updating Salesforce Record with data:', updateData);
            await conn.sobject('Student_Wallet_Pass__c').update({ Id: salesforceRecordId, ...updateData });

            console.log('Device successfully registered for pass updates.');
            res.status(201).send('Device successfully registered for pass updates');

        } catch (error) {
            console.error('Error during device registration:', error);
            res.status(500).send('Error registering device');
        }
    }
);

app.post('/generateApplePass', (req, res) => {
    console.log('Generating Apple Pass...');
    generateApplePass(req, res);
});

app.post('/generateGooglePass', async (req, res) => {
    console.log('Generating Google Pass...');
    
    try {
        await generateGooglePass.createPassClass();
        console.log('Pass class created.');

        const { studentId, studentName, admissionNo, studentClass, leavingDate, extParentId, parentId, parentName, parentNumber } = req.body;
        console.log('Google Pass Data:', { studentId, studentName, admissionNo, studentClass, leavingDate, extParentId, parentId, parentName, parentNumber });

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
