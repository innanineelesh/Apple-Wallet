const express = require('express');
const bodyParser = require('body-parser');
const generateApplePass = require('./generateApplePass');
const generateGooglePass = require('./generateGooglePass');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 

app.post('/generateApplePass', generateApplePass);

app.post('/generateGooglePass', async (req, res) => {
    try {
        await generateGooglePass.createPassClass();
        const { saveUrl, studentId, token } = await generateGooglePass.createPassObject(
            req.body.studentId,
            req.body.studentName,
            req.body.admissionNo,
            req.body.yearGroup,
            req.body.studentClass,
            req.body.parentId,
            req.body.parentName,
            req.body.parentNumber
        );
        res.json({ saveUrl, studentId, token });
    } catch (err) {
        console.error('Error creating pass:', err);
        res.status(500).send('Error creating pass');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
