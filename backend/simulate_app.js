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
      body: "Rs.400.00 debited to AL BAIK TAHARI via UPI on 01Mar26. Ref: 410123456789.",
      date: "2024-04-10 10:30:45"
    },
    {
      sender: "SBI-UPIN",
      body: "₹1,200.00 received from Rahul via UPI on 05Apr26. Ref: 987654321034.",
      date: "2024-04-10 11:15:20"
    },
    {
      sender: "AXIS-PAY",
      body: "INR 250.00 paid to Swiggy on 10Apr26. Ref: AX12345.",
      date: "2024-04-10 12:00:00"
    },
    {
      sender: "ICICI-BNK",
      body: "Your A/c x4321 is credited with Rs.10,500.00 from Uncle Sam via UPI on 12Apr26.",
      date: "2024-04-10 13:00:00"
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
    'Content-Length': Buffer.byteLength(data)
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

console.log('Sending 4 simulated financial messages...');
req.write(data);
req.end();
