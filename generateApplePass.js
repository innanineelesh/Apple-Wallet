const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const jsonfile = require('jsonfile');
const forge = require('node-forge');
const crypto = require('crypto');

const passDir = path.join(__dirname, 'lollipop.pass');
const certsDir = path.join(__dirname, 'certs');
const passFileName = 'Lollipop.pkpass';

const certFile = path.join(certsDir, 'signingCert.pem');
const keyFile = path.join(certsDir, 'signingKey.pem');
const wwdrFile = path.join(certsDir, 'WWDR.pem');

module.exports = async (req, res) => {
    const {
        studentId,
        studentName,
        admissionNo,
        studentClass,
        leavingDate,
        extParentId,
        parentId,
        parentName,
        parentNumber,
        deviceToken // Capture deviceToken
    } = req.body;

    const currentDate = new Date().toISOString();
    const token = `${currentDate}-${studentId}`;
    const passtoken = `${currentDate}-${studentId}`;
    const passJsonPath = path.join(passDir, 'pass.json');
    const passJson = jsonfile.readFileSync(passJsonPath);

    // Update the pass.json fields with the required data
    passJson.serialNumber = studentId;
    passJson.barcode.message = JSON.stringify({
        admissionNo,
        studentId,
        parentId,
        passtoken,
        studentName,
        admissionNo,
        studentClass,
        leavingDate,
        extParentId,
        parentName,
        parentNumber
    });
    passJson.generic.primaryFields[0].value = studentName;
    passJson.generic.secondaryFields[0].value = admissionNo;
    passJson.generic.secondaryFields[1].value = studentClass;
    passJson.generic.secondaryFields[2].value = leavingDate;
    passJson.generic.auxiliaryFields[0].value = extParentId;
    passJson.generic.auxiliaryFields[1].value = parentName;
    passJson.generic.auxiliaryFields[2].value = parentNumber;

    jsonfile.writeFileSync(passJsonPath, passJson, { spaces: 2 });

    try {
        await createPassPackage();

        // Set headers to include studentId, token, parentId, and deviceToken
        res.setHeader('parentId', parentId);
        res.setHeader('studentId', studentId);
        res.setHeader('token', token);
        res.setHeader('Device-Token', deviceToken); // Include deviceToken in the response

        // Return the generated pass for download
        res.download(path.join(__dirname, passFileName), 'StudentPass.pkpass');
    } catch (err) {
        console.error('Error generating pass package:', err);
        res.status(500).send('Error generating pass');
    }
};

// Function to create the pass package and sign it
const createPassPackage = async () => {
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

    const output = fs.createWriteStream(path.join(__dirname, passFileName));
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
        output.on('close', () => {
            console.log(`Created pass package with ${archive.pointer()} total bytes`);
            resolve();
        });

        archive.on('error', err => {
            reject(err);
        });

        archive.pipe(output);
        archive.directory(passDir + '/', false);
        archive.finalize();
    });
};
