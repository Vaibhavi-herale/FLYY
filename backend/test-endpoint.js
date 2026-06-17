const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/webhooks/confirm/663a123b45c67890def12345', // Dummy ID just to see if it hits
  method: 'POST'
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('BODY:', data);
  });
});

req.on('error', e => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
