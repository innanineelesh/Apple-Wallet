const express = require('express');
const bodyParser = require('body-parser');
const jsforce = require('jsforce');
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
        await conn.login('neelesh@conx.digital1', '1455@Neel', {
            clientId: '3MVG9OjW2TAjFKUsXpXOE8doscdtnO4mYBV3RRiYfnwi.4iz.r7QlHznmMfrZIisW66Rhh2LF11GPrraR57_i',
            clientSecret: '3B77EA503435EFA5B6C5CA0D2AA6166CB5C69735848D47CD1D367270BB8F2C8C'
        });
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

            await getAccessToken();

            const [studentId, parentId] = serialNumber.split('-');
            const query = `SELECT Id FROM Student_Wallet_Pass__c WHERE student__c='${studentId}' AND parent__c='${parentId}' LIMIT 1`;

            const queryResponse = await conn.query(query);

            if (!queryResponse.records || queryResponse.records.length === 0) {
                return res.status(404).send('No record found for the given student and parent combination');
            }

            const salesforceRecordId = queryResponse.records[0].Id;

            const updateData = {
                Push_Token__c: pushToken,
                Device_Library_Identifier__c: deviceLibraryIdentifier
            };

            await conn.sobject('Student_Wallet_Pass__c').update({ Id: salesforceRecordId, ...updateData });
            res.status(201).send('Device successfully registered for pass updates');

        } catch (error) {
            console.error('Error during device registration:', error);
            res.status(500).send('Error registering device');
        }
    }
);

app.post('/generateApplePass', (req, res) => {
    generateApplePass(req, res);
});

app.post('/generateGooglePass', async (req, res) => {
    try {
        await generateGooglePass.createPassClass();
        const { saveUrl, studentId, passtoken , parentId} = await generateGooglePass.createOrUpdatePassObject(
            req.body.studentId,
            req.body.studentName,
            req.body.admissionNo, 
            req.body.studentClass,
            req.body.leavingDate,
            req.body.extParentId,
            req.body.parentId,
            req.body.parentName,
            req.body.parentNumber
        );
        res.set({
            'studentId': studentId,
            'token': passtoken,
            'parentId': parentId
        });
        res.json({ saveUrl });
    } catch (err) {
        console.error('Error creating pass:', err);
        res.status(500).send('Error creating pass');
    }
});

app.post('/updateGooglePass', (req, res) => {
    updateGooglePass(req, res);
});

app.post('/updateApplePass', (req, res) => {
    updateApplePass(req, res);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
