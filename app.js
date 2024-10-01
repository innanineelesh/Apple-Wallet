const express = require('express');
const bodyParser = require('body-parser');
const generateApplePass = require('./generateApplePass');
const generateGooglePass = require('./generateGooglePass');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 

const saveDevice = async (deviceToken, serialNumber) => {
    try {
        // Add your logic to store deviceToken and serialNumber
        console.log(`Device Token: ${deviceToken}, Serial Number: ${serialNumber}`);
        // Example: await yourSalesforceAPICall(deviceToken, serialNumber);
        return { success: true };
    } catch (error) {
        console.error('Error saving device token:', error);
        throw new Error('Failed to save device token');
    }
};

// Device registration endpoint
app.post('/passes', //async (req, res) => {
    // console.log('Device Registration Request Received');
    // console.log('Request Body:', req.body);
    // console.log('Serial Number:', req.params.serialNumber);
    // console.log('Device Library Identifier:', req.params.deviceLibraryIdentifier);

    // const deviceToken = req.body.deviceToken;
    // const serialNumber = req.params.serialNumber;

    // if (!deviceToken || !serialNumber) {
    //     return res.status(400).send('Missing deviceToken or serialNumber');
    // }

    // try {
    //     // Save the device token and serial number
    //     await saveDevice(deviceToken, serialNumber);
    //     res.sendStatus(200);
    // } catch (error) {
    //     console.error('Error saving device token:', error);
    //     res.status(500).send('Internal Server Error');
    // }
});


app.post('/generateApplePass', generateApplePass);

app.post('/generateGooglePass', async (req, res) => {
    try {
        await generateGooglePass.createPassClass();
        const { saveUrl, studentId, passtoken , parentId} = await generateGooglePass.createPassObject(
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
