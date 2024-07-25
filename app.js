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
        await generateGooglePass.createPassClass(req, res);
        const result = await generateGooglePass.createPassObject(req, res);
        res.json(result);
    } catch (err) {
        console.error('Error creating pass:', err);
        res.status(500).send('Error creating pass');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
