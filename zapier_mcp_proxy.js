const readline = require('readline');
const fs = require('fs');

// File logging is disabled now that things are working properly
function log(msg) { /* fs.appendFileSync(logFile, new Date().toISOString() + ' ' + msg + '\n'); */ }

// The Zapier SSE URL from the MCP config
const URL = "https://mcp.zapier.com/api/v1/connect?token=ZDlkY2VjOWQtZTI0OS00MmI3LTg2ZjYtOWRkZGI1ZTMwNmM4OnA4YzRQUUhsZGdTMXV1UWxOZFVkRERiTi9vUVdKRUc2K2dvWEpHRHZsbzA9";

let postEndpoint = URL;

async function start() {
  log("Starting proxy...");
  const response = await fetch(URL, {
    headers: {
      'Accept': 'text/event-stream'
    }
  });

  if (!response.body) {
    log("Error: No response body");
    process.exit(1);
  }

  // Handle incoming SSE stream
  const stream = response.body;
  let buffer = '';
  let currentEvent = 'message';

  function processLine(line) {
    if (line.startsWith('event: ')) {
      currentEvent = line.substring(7).trim();
      log("Event: " + currentEvent);
    } else if (line.startsWith('data: ')) {
      const data = line.substring(6);
      log("Data: " + data);
      if (currentEvent === 'endpoint') {
        // According to MCP spec, the endpoint event gives us the URL to POST to
        try {
          postEndpoint = new URL(data, URL).toString();
          log("Endpoint updated (URL object): " + postEndpoint);
        } catch (e) {
          postEndpoint = data;
          log("Endpoint updated (string fallback): " + postEndpoint);
        }
      } else {
        // It's a standard MCP JSON-RPC message
        process.stdout.write(data + '\n');
      }
    } else if (line === '') {
      currentEvent = 'message';
    }
  }

  // Async iterator for body streams
  for await (const chunk of stream) {
    buffer += Buffer.from(chunk).toString('utf-8');
    let x;
    while ((x = buffer.indexOf('\n')) !== -1) {
      const line = buffer.substring(0, x).replace(/\r$/, '');
      processLine(line);
      buffer = buffer.substring(x + 1);
    }
  }
}

start().catch(e => {
  console.error(e);
  process.exit(1);
});

// Handle stdin from the local AI client (Antigravity) and POST it to Zapier
const rl = readline.createInterface({
  input: process.stdin,
  terminal: false
});

rl.on('line', async (line) => {
  if (!line.trim()) return;
  log("STDIN received: " + line);
  try {
    const res = await fetch(postEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream' 
      },
      body: line
    });
    const postBody = await res.text();
    log("POST status: " + res.status + " body length: " + postBody.length);
    
    // Zapier incorrectly sends the JSON-RPC response WITHIN the POST HTTP response, 
    // formatted as an SSE event! We must extract it and send it back to the editor.
    const lines = postBody.split('\n');
    for (const l of lines) {
      if (l.startsWith('data: ')) {
        const data = l.substring(6).trim();
        process.stdout.write(data + '\n');
        log("Sent to STDOUT: " + data);
      }
    }
  } catch (e) {
    log("POST Error: " + e.message);
  }
});
