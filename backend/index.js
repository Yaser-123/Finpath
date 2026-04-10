const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// In-memory storage
let receivedMessages = [];

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Endpoint: POST /api/sms
app.post('/api/sms', (req, res) => {
    const messages = req.body.messages;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ status: 'error', message: 'Invalid request body' });
    }

    console.log(`\n--- Received ${messages.length} messages ---`);
    
    // 1. Log all message bodies
    messages.forEach((msg, index) => {
        console.log(`[${index + 1}] From: ${msg.sender} | Body: ${msg.body}`);
    });

    // 2. Print first 5 messages explicitly (if they exist)
    console.log('\n>>> Sample (First 5 messages):');
    messages.slice(0, 5).forEach((msg, index) => {
        console.log(`- ${msg.sender}: ${msg.body.substring(0, 50)}...`);
    });

    // 3. Store temporarily in memory
    receivedMessages = [...receivedMessages, ...messages];

    // 4. Send response with count and sample
    const sampleBody = messages.length > 0 ? messages[0].body : 'No messages';
    
    res.json({
        status: 'success',
        count: messages.length,
        sample: sampleBody
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`SMS Backend server running on http://localhost:${PORT}`);
    console.log(`Endpoint ready at http://localhost:${PORT}/api/sms`);
});
