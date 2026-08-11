const http = require('http');

function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(options, res => {
      let resData = '';
      res.on('data', chunk => { resData += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(resData) });
      });
    });
    req.on('error', e => reject(e));
    req.write(data);
    req.end();
  });
}

function makeAuthRequest(path, data, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${token}`
      }
    };
    const req = http.request(options, res => {
      let resData = '';
      res.on('data', chunk => { resData += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(resData) });
      });
    });
    req.on('error', e => reject(e));
    req.write(data);
    req.end();
  });
}

async function run() {
  const regData = JSON.stringify({
    name: 'Test User',
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    confirmPassword: 'password123'
  });
  
  const regRes = await makeRequest('/api/users/register', regData);
  console.log('Reg:', regRes);
  const token = regRes.data.token;
  
  const chatData = JSON.stringify({
    messages: [{ role: 'user', content: 'hello' }],
    aiModel: 'gemini',
    personality: 'professional'
  });
  
  const chatRes = await makeAuthRequest('/api/chat', chatData, token);
  console.log('Chat:', chatRes);
}

run();
