# SMS Backend

Simple Express server for receiving and logging SMS messages from the Android app.

## Setup Instructions

1. **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) installed.
2. **Installation**:
   ```bash
   cd backend
   npm install
   ```
3. **Run**:
   ```bash
   npm start
   ```
4. **Endpoint**: 
   - URL: `http://localhost:5000/api/sms`
   - Method: `POST`

## Demo Tips
- When messages are synced from the app, look at the terminal where this server is running.
- You will see every message logged, plus a dedicated "Sample" block for the first 5 records.
- The app will show a success message with the count returned by this server.

## Troubleshooting
- **Real Device**: If testing on a physical Android phone, change the `baseUrl` in `SmsRepository.kt` from `10.0.2.2` to your computer's local IP address (e.g., `192.168.1.X`).
- **Firewall**: Ensure port `5000` is open on your host machine if using a real device.
