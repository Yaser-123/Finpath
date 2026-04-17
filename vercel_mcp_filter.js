const { spawn } = require('child_process');
const readline = require('readline');

// The tools the user explicitly wants to keep
const ALLOWED_TOOLS = [
  'vercel_list_deployments',
  'vercel_list_projects',
  'vercel_redeploy',
  'vercel_list_env_vars',
  'vercel_create_env_var',
  'vercel_update_env_var',
  'vercel_export_blob_data',
  'vercel_clone_storage',
  'vercel_import_blob_data',
  'vercel_scan_deployment_security',
  'vercel_get_security_headers'
];

// Start the actual MCP server
const isWindows = process.platform === 'win32';
const child = spawn(isWindows ? 'npx.cmd' : 'npx', ['-y', '@robinson_ai_systems/vercel-mcp'], {
  env: process.env,
  stdio: ['pipe', 'pipe', 'inherit'], // pipe stdin and stdout, inherit stderr
  shell: true // Important for Windows fallback
});

// Pass our stdin directly to the child
process.stdin.pipe(child.stdin);

// Read stdout line by line
const rl = readline.createInterface({
  input: child.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  
  try {
    const msg = JSON.parse(line);
    
    // If server is responding to tools/list, filter it!
    if (msg.result && msg.result.tools && Array.isArray(msg.result.tools)) {
      msg.result.tools = msg.result.tools.filter(tool => ALLOWED_TOOLS.includes(tool.name));
    }
    
    // Write modified (or untouched) message back to our stdout
    // We log it straight out
    process.stdout.write(JSON.stringify(msg) + '\n');
    
  } catch (e) {
    // If it's not valid JSON, just pass it through exactly as it was
    process.stdout.write(line + '\n');
  }
});

// Handle child exit
child.on('close', (code) => {
  process.exit(code || 0);
});
