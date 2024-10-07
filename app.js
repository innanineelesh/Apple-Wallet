const express = require('express');
const bodyParser = require('body-parser');
const generateApplePass = require('./generateApplePass');
const generateGooglePass = require('./generateGooglePass');
const updateGooglePass = require('./updateGooglePass');
const updateApplePass = require('./updateApplePass');

const app = express();
const port = 3000;

// Middleware to parse incoming requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 

// Endpoint to register a device for pass updates
app.post(
    "/:version/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber",
    async (req, res) => {
        try {
            const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;
            const { pushToken } = req.body;

            console.log('Device registered for pass updates:', { deviceLibraryIdentifier, passTypeIdentifier, serialNumber, pushToken });

            res.status(201).send('Device successfully registered for pass updates');
        } catch (error) {
            console.error('Error during device registration:', error);
            res.status(500).send('Error registering device');
        }
    }
);

// Endpoint to generate a new Apple Wallet pass
app.post('/generateApplePass', generateApplePass);

// Endpoint to generate or update a Google Wallet pass
app.post('/generateGooglePass', async (req, res) => {
    try {
        // Ensure the Google pass class exists before creating/updating the pass
        await generateGooglePass.createPassClass();

        // Create or update the Google Wallet pass and retrieve the save URL
        const { saveUrl, studentId, passtoken, parentId } = await generateGooglePass.createOrUpdatePass(
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

        // Set response headers for additional pass information
        res.set({
            'studentId': studentId,
            'token': passtoken,
            'parentId': parentId
        });
        
        // Send the save URL back to the client
        res.json({ saveUrl });
    } catch (err) {
        console.error('Error creating/updating Google pass:', err);
        res.status(500).send('Error creating/updating Google pass');
    }
});

// Endpoint to update a Google Wallet pass
app.patch('/updateGooglePass', updateGooglePass);

// Endpoint to update an Apple Wallet pass
app.post('/updateApplePass', updateApplePass);

// Start the server and listen for incoming requests
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
