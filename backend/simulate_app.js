/**
 * SIMULATE APP SCRIPT
 * This script mimics the behavior of the Android App by sending
 * dummy financial SMS data to your backend.
 */

const http = require('http');

const data = JSON.stringify({
  messages: [
    {
      sender: "HDFC-BANK",
      body: "Rs 500.00 debited from Ac xx123 for UPI txn to Ramesh. Ref: 410123456789.",
      date: "2024-04-10 10:30:45"
    },
    {
      sender: "SBI-UPIN",
      body: "Your A/c x5678 is credited by ₹1,200.00 on 10/04/24. Ref: 987654321034.",
      date: "2024-04-10 11:15:20"
    },
    {
      sender: "AMAZON-PAY",
      body: "Paid INR 150.00 for order ID #9876. Txn ID: AZN123456.",
      date: "2024-04-10 12:00:00"
    }
  ]
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/sms',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('\n--- SIMULATED APP RESPONSE ---');
    console.log(`Status: ${res.statusCode}`);
    console.log('Body:', JSON.parse(body));
    console.log('------------------------------\n');
  });
});

req.on('error', (error) => {
  console.error('Error connecting to backend:', error.message);
  console.log('\nMake sure your backend is running! (npm start in backend folder)');
});

console.log('Sending 3 simulated financial messages...');
req.write(data);
req.end();
