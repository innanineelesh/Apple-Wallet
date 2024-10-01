// passes.js
const express = require('express');
const router = express.Router();

// Device registration endpoint
router.post('/', (req, res) => {
    console.log('Device Registration Request Received'); // Log statement

    res.sendStatus(200); // Respond with a 200 status code
});

module.exports = router; // Export the router
