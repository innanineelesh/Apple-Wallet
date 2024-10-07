const express = require('express');
const bodyParser = require('body-parser');
const generateApplePass = require('./generateApplePass');
const generateGooglePass = require('./generateGooglePass');
const updateGooglePass = require('./updateGooglePass');
const updateApplePass = require('./updateApplePass');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 

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

app.post('/generateApplePass', generateApplePass);

app.post('/generateGooglePass', async (req, res) => {
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
