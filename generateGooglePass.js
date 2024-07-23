require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const issuerId = '3388000000022351279';
const classId = `${issuerId}.studentPass`;
const baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';

// Service account credentials directly used
const credentials = {
    "type": "service_account",
    "project_id": "digital-pass-conx",
    "private_key_id": "b87be9a60e7f9e3f08330b1ed293a927b30fe047",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDi5nKcD8hYpRN4\n6chH9fvMiKCXjrkbEx6kTWL5FLMsR9zi3Y9x2v+J6y9MhcWrqRbq2HmwUXcAWze/\ntCBTKXIOJr75VMiMsjH+KpPUMZ0bzqOpmrf0VNa4ZywJg+ZWv1noSCBJmgRjiyiM\nlkJZldemMDWO4CV2FixrHJdyFThY2uFJCEBVDsV52EBqF2TKsN9SD38grdu+b8J/\nd87izxxTsl75MYXv3xAhp2SQxM3b5TWqjsP+dJ48yhXJGZlrAqksGwjRlvXAGwoq\newgGHcl8hJ1kdaTo+zzLx6s0h//GesxRVzqXLtN70n0Yazpum5llGbpYnbSB3DCy\nHr9ccc2ZAgMBAAECggEAAq61sOjiW1hDQ0u56440dn9F18OEZnYAHRzm7u8q1vA4\nDoIO97TT49FmbyBfPSzr9Drlhbs8KGJ2Wvi3ZPL23K+M/zAHNBueCe/+rKnpU7Uf\nu/Sew1+Wj2+f0TJ7IFrVhntGJMdH0UCe9M+IyVvt710/StkVSaC65clyHxNcuyHV\n8oWlk/uyAA0vzOOEsYfgoyS+mRWNb6F9PyjUGpPQe3TLBjjax6GsJQtOn4SNPXup\nH9vd740jmcRHEC4U5e4VZ5Gf1GeKkUaXWLAmi2L8TlZ7Y4nspsvz+KzMrZuUw8xc\nOhOr38GtlESEszHjYDPEDOKDiBFGVajMD9ZMda+dQQKBgQD3obfbC/CqyHr0UrnD\n7FCk6XxQXj5qu0HcUWibnn6fgJWxZAINIUtzyCsqXb8fMs/yig2SHFtzSaxMlrAR\nZZ0fbJiU6CD83IrNrHAVNb6AWojzf8Dyc4XqcDRxyANIGtfUSm6lf9amB2KOdN7l\nvVrkFVHTP8OorjudigDEH+OLwQKBgQDqkWEhhahjDdFgKpbp8TMc3vve7OYGYWKO\nwC+9y54LtP6zHLU4FBM8u+ihLijh2VeVlfD0nm+FJ9Rk+O2ISuYxDRPvp8BoGvOG\nnmWDtu8y42mhKHz1vBAdDOOTmg6cJgM/eMFOpBikM1ryr02/5REZwxLBOW8J/WiG\nSAi8q4IX2QKBgQDsl0cI8ox7L1ZCDrPLnAGkvit2wcRSxxxyuhj+7dw+2mSq+kj3\ncIMdWPbc4HqU/UAuk3XJzmwVZyNGfYY06OfIuUHCq1GxJak8Pm9L5HBhQ56rPrkD\nLBqbVZ7VwupXvsXM31x9pPlY4Z9pSgIYb+TiG/h0o+x1QhpVNx/qQiluQQKBgGKf\nu4ofq1vyfF0FqywzmL0D2DyzuEdofMrubWRMj2f2srxWTq+EaU4456eVQ+Upv9SK\nFaSUVOlUhM3rh9utOjnXeNFj49chtdCdGquVp97qlQgIgPnFF7VPLQRrWsc2iFkQ\niZ5qCl5HpW6yXGtZgaYmSeVqI5C8tkz3To0dQ3aJAoGAHXpR9H0XJGCnZPx/Sf04\nQQPuw6oLwgcs4QyD8qClmhnuWWJ6OczaKr9nIbyGv0QQZt9/mD1M4Uw0eDLT7Llm\niJdd3/NfFlIAElZFDpEQ5/XVudkG5YnLIDTcamSansEcYXGEV/2CL9SQhiZNbQV4\nxdMfZvus35T6nRZhNQH3/B0=\n-----END PRIVATE KEY-----\n",
    "client_email": "digital-pass-conx@digital-pass-conx.iam.gserviceaccount.com",
    "client_id": "105972286424899033022",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/digital-pass-conx%40digital-pass-conx.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
};

const auth = new GoogleAuth({
    credentials: credentials,
    scopes: 'https://www.googleapis.com/auth/wallet_object.issuer'
});

const createPassClass = async (req, res, next) => {
    const genericClass = {
        "id": classId,
        "classTemplateInfo": {
            "cardTemplateOverride": {
                "cardRowTemplateInfos": [
                    {
                        "threeItems": {
                            "startItem": {
                                "firstValue": {
                                    "fields": [
                                        {
                                            "fieldPath": "object.textModulesData['admission_no']",
                                        },
                                    ],
                                },
                            },
                            "middleItem": {
                                "firstValue": {
                                    "fields": [
                                        {
                                            "fieldPath": "object.textModulesData['year_group']",
                                        },
                                    ],
                                },
                            },
                            "endItem": {
                                "firstValue": {
                                    "fields": [
                                        {
                                            "fieldPath": "object.textModulesData['class']",
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    {
                        "twoItems": {
                            "startItem": {
                                "firstValue": {
                                    "fields": [
                                        {
                                            "fieldPath": "object.textModulesData['parent_id']",
                                        },
                                    ],
                                },
                            },
                            "endItem": {
                                "firstValue": {
                                    "fields": [
                                        {
                                            "fieldPath": "object.textModulesData['parent_name']",
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    {
                        "oneItem": {
                            "item": {
                                "firstValue": {
                                    "fields": [
                                        {
                                            "fieldPath": "object.textModulesData['parent_number']",
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
            },
        },
    };

    try {
        await auth.request({
            url: `${baseUrl}/genericClass/${classId}`,
            method: 'GET'
        });
        next();
    } catch (err) {
        if (err.response && err.response.status === 404) {
            try {
                await auth.request({
                    url: `${baseUrl}/genericClass`,
                    method: 'POST',
                    data: genericClass
                });
                next();
            } catch (err) {
                console.error(err);
                res.status(500).send('Error creating class');
            }
        } else {
            console.error(err);
            res.status(500).send('Error creating class');
        }
    }
};

const createPassObject = async (req, res) => {
    const { studentId, studentName, studentAdmissionNo, studentYearGroup, studentClass, parentId, parentName, parentNumber } = req.body;
    const studentPass = {
        "id": `${classId}.${studentId}`,
        "classId": classId,
        "state": "active",
        "version": "1",
        "barcode": {
            "type": "qrCode",
            "value": jwt.sign({ studentId }, process.env.JWT_SECRET)
        },
        "infoModuleData": {
            "infoModuleData": {
                "header": {
                    "title": studentName,
                },
                "body": [
                    {
                        "name": "Admission No",
                        "value": studentAdmissionNo,
                    },
                    {
                        "name": "Year Group",
                        "value": studentYearGroup,
                    },
                    {
                        "name": "Class",
                        "value": studentClass,
                    },
                    {
                        "name": "Parent ID",
                        "value": parentId,
                    },
                    {
                        "name": "Parent Name",
                        "value": parentName,
                    },
                    {
                        "name": "Parent Number",
                        "value": parentNumber,
                    },
                ],
            },
        },
    };

    try {
        await auth.request({
            url: `${baseUrl}/genericObject/${studentPass.id}`,
            method: 'GET'
        });
        res.status(400).send('Pass object already exists');
    } catch (err) {
        if (err.response && err.response.status === 404) {
            try {
                await auth.request({
                    url: `${baseUrl}/genericObject`,
                    method: 'POST',
                    data: studentPass
                });
                res.status(201).send('Pass object created successfully');
            } catch (err) {
                console.error(err);
                res.status(500).send('Error creating pass object');
            }
        } else {
            console.error(err);
            res.status(500).send('Error creating pass object');
        }
    }
};

module.exports = {
    createPassClass,
    createPassObject
};
