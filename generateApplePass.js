const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const jsonfile = require('jsonfile');
const forge = require('node-forge');
const crypto = require('crypto');

const app = express();
const port = 3000;

const passDir = path.join(__dirname, 'Lollipop.pass');
const certsDir = path.join(__dirname, 'certs');
const passFileName = 'Lollipop.pkpass';

const certFile = path.join(certsDir, 'signingCert.pem');
const keyFile = path.join(certsDir, 'signingKey.pem');
const wwdrFile = path.join(certsDir, 'WWDR.pem');

app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint for generating Apple Wallet pass
app.post('/generateApplePass', (req, res) => {
    const { studentName, admissionNo, studentClass, yearGroup, parentId, parentName, parentNumber } = req.body;

    // Update the pass.json with the provided data
    const passJsonPath = path.join(passDir, 'pass.json');
    const passJson = jsonfile.readFileSync(passJsonPath);

    passJson.barcode.message = admissionNo;
    passJson.generic.primaryFields[0].value = studentName; // Setting student name
    passJson.generic.secondaryFields[0].value = admissionNo; // Setting admission number
    passJson.generic.secondaryFields[1].value = studentClass; // Setting student class
    passJson.generic.secondaryFields[2].value = yearGroup; // Setting year group
    passJson.generic.auxiliaryFields[0].value = parentId; // Setting parent ID
    passJson.generic.auxiliaryFields[1].value = parentName; // Setting parent name
    passJson.generic.auxiliaryFields[2].value = parentNumber; // Setting parent number

    jsonfile.writeFileSync(passJsonPath, passJson, { spaces: 2 });

    createPassPackage(res);
});

// Function to create the pass package
const createPassPackage = async (res) => {
    try {
        const files = fs.readdirSync(passDir);
        const manifest = {};

        files.forEach(file => {
            if (file !== 'manifest.json' && file !== 'signature') {
                const filePath = path.join(passDir, file);
                const fileBuffer = fs.readFileSync(filePath);
                const hash = crypto.createHash('sha1').update(fileBuffer).digest('hex');
                manifest[file] = hash;
            }
        });

        jsonfile.writeFileSync(path.join(passDir, 'manifest.json'), manifest, { spaces: 2 });

        const manifestPath = path.join(passDir, 'manifest.json');
        const signaturePath = path.join(passDir, 'signature');

        const privateKeyPem = fs.readFileSync(keyFile, 'utf8');
        const certPem = fs.readFileSync(certFile, 'utf8');
        const caCertPem = fs.readFileSync(wwdrFile, 'utf8');

        const pki = forge.pki;
        const privateKey = pki.privateKeyFromPem(privateKeyPem);
        const certificate = pki.certificateFromPem(certPem);
        const caCert = pki.certificateFromPem(caCertPem);

        const p7 = forge.pkcs7.createSignedData();
        p7.content = forge.util.createBuffer(fs.readFileSync(manifestPath), 'utf8');

        p7.addCertificate(certificate);
        p7.addCertificate(caCert);
        p7.addSigner({
            key: privateKey,
            certificate: certificate,
            digestAlgorithm: forge.pki.oids.sha1,
            authenticatedAttributes: [
                {
                    type: forge.pki.oids.contentType,
                    value: forge.pki.oids.data
                },
                {
                    type: forge.pki.oids.messageDigest
                },
                {
                    type: forge.pki.oids.signingTime,
                    value: new Date()
                }
            ]
        });

        p7.sign();

        const derBuffer = Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), 'binary');
        fs.writeFileSync(signaturePath, derBuffer);

        console.log('Pass signed successfully.');

        const output = fs.createWriteStream(path.join(__dirname, passFileName));
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        output.on('close', () => {
            console.log(`${archive.pointer()} total bytes`);
            console.log('Pass created successfully.');
            res.download(path.join(__dirname, passFileName), 'StudentPass.pkpass');
        });

        archive.on('error', err => {
            throw err;
        });

        archive.pipe(output);
        archive.directory(passDir + '/', false);
        archive.finalize();
    } catch (err) {
        console.error('Error creating pass package:', err);
        res.status(500).send('Error generating pass');
    }
};

module.exports = app;
