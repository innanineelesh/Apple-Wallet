// passes.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

module.exports = async (req, res) => {
    
console.log(req);
const url = 'https://apple-wallet.onrender.com/passes';

// Set the request body with the necessary parameters
const requestBody = {
    deviceLibraryIdentifier: '0017Y00002AvQiYQAV',
    passTypeIdentifier: 'pass.com.srs.studentpass.identifier',
    serialNumber: '0017Y00002AvQiYQAV'
};

// Set the headers, including the Authorization header
const headers = {
    'Authorization': 'ApplePass vxwxd7J8AlNNFPS8k0a0FfUFtq0ewzFdc',
    'Content-Type': 'application/json'  // Specify the content type
};

// Make the POST request
axios.post(url, requestBody, { headers })
    .then(response => {
        console.log('Response Status:', response.status);
        console.log('Response Data:', response.data);
    })
    .catch(error => {
        console.error('Error:', error.response ? error.response.data : error.message);
    });

};
