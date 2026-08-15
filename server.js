const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const MAX_BODY_SIZE = 1024 * 1024; // 1MB
const INDEX_HTML = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));

const sseClients = new Set();

function broadcast(text) {
  const payload = `data: ${JSON.stringify({ text })}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

function readBody(req, res) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: '텍스트가 너무 깁니다.' }));
        req.destroy();
        reject(new Error('too large'));
      }
    });
    req.on('end', () => resolve(body));
  });
}

function getLocalIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(INDEX_HTML);
    return;
  }

  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (req.method === 'POST' && req.url === '/live') {
    readBody(req, res)
      .then((body) => {
        broadcast(body);
        res.writeHead(204);
        res.end();
      })
      .catch(() => {});
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`netdrop 서버가 실행 중입니다.`);
  console.log(`  로컬:  http://localhost:${PORT}`);
  for (const ip of getLocalIps()) {
    console.log(`  같은 Wi-Fi: http://${ip}:${PORT}`);
  }
});
