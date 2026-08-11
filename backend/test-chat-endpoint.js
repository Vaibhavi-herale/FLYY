const http = require('http');

const data = JSON.stringify({
  messages: [{ role: 'user', content: 'hello' }],
  aiModel: 'gemini',
  personality: 'professional'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    // Need a valid token to bypass protectUser, or we just temporarily bypass it for the test
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let resData = '';
  res.on('data', chunk => { resData += chunk; });
  res.on('end', () => {
    console.log('BODY:', resData);
    process.exit(0);
  });
});

req.on('error', e => {
  console.error(`problem with request: ${e.message}`);
  process.exit(1);
});

req.write(data);
req.end();
