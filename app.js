const express = require('express');
const bodyParser = require('body-parser');
const jsforce = require('jsforce');
const generateApplePass = require('./generateApplePass');
const generateGooglePass = require('./generateGooglePass');


const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/generateApplePass', (req, res) => {
    generateApplePass(req, res);
});

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

app.post('/updateGooglePass', (req, res) => {
    updateGooglePass(req, res);
});

app.post('/updateApplePass', (req, res) => {
    updateApplePass(req, res);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
