const express = require('express');
const bodyParser = require('body-parser');
const generateApplePass = require('./generateApplePass');
const generateGooglePass = require('./generateGooglePass');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

// Route for generating Apple Wallet pass
app.post('/generateApplePass', generateApplePass);

// Route for generating Google Pay pass
app.post('/generateGooglePass', async (req, res) => {
    try {
        await generateGooglePass.createPassClass(req, res, async () => {
            const saveUrl = await generateGooglePass.createPassObject(req, res);
            res.json({ saveUrl });
        });
    } catch (err) {
        console.error('Error creating pass:', err);
        res.status(500).send('Error creating pass');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
