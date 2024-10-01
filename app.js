const express = require('express');
const bodyParser = require('body-parser');
const generateApplePass = require('./generateApplePass');
const generateGooglePass = require('./generateGooglePass');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 

// Device registration endpoint
app.post('/passes/:version/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber', (req, res) => {
  const deviceToken = req.body.deviceToken;
  const serialNumber = req.params.serialNumber;

  // Save the device token and serial number in the database
  saveDevice(deviceToken, serialNumber);

  res.sendStatus(200);
});

// Generate Apple Wallet Pass and include deviceToken in response
app.post('/generateApplePass', async (req, res) => {
    const deviceToken = req.body.deviceToken; // Capture deviceToken from the request body

    try {
        await generateApplePass(req, res); // Call the pass generation function

        // After the pass is generated, include the deviceToken in the response headers
        res.setHeader('Device-Token', deviceToken);
        res.setHeader('Content-Type', 'application/json');

        // Send JSON response including studentId, parentId, token, and deviceToken
        res.json({
            success: true,
            message: "Pass generated successfully",
            deviceToken: deviceToken,
            studentId: req.body.studentId,
            parentId: req.body.parentId,
            token: req.body.token
        });
    } catch (err) {
        console.error('Error generating Apple pass:', err);
        res.status(500).send('Error generating Apple pass');
    }
});

// Generate Google Wallet Pass
app.post('/generateGooglePass', async (req, res) => {
    try {
        await generateGooglePass.createPassClass();
        const { saveUrl, studentId, passtoken , parentId } = await generateGooglePass.createPassObject(
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
        console.error('Error creating Google pass:', err);
        res.status(500).send('Error creating Google pass');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
