const http = require('http');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const MAX_BODY_SIZE = 1024 * 1024; // 1MB
const INDEX_HTML = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));

function copyToClipboard(text) {
  return new Promise((resolve, reject) => {
    const platform = os.platform();
    const attempt = (cmd, args) => {
      const child = spawn(cmd, args);
      let failed = false;
      child.on('error', () => {
        failed = true;
        if (platform === 'linux' && cmd === 'xclip') {
          attempt('xsel', ['--clipboard', '--input']);
        } else {
          reject(new Error(`clipboard command not found: ${cmd}`));
        }
      });
      child.on('close', (code) => {
        if (!failed) {
          code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`));
        }
      });
      child.stdin.write(text);
      child.stdin.end();
    };

    if (platform === 'darwin') {
      attempt('pbcopy', []);
    } else if (platform === 'win32') {
      attempt('clip', []);
    } else {
      attempt('xclip', ['-selection', 'clipboard']);
    }
  });
}

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

  if (req.method === 'POST' && req.url === '/paste') {
    readBody(req, res)
      .then((body) =>
        copyToClipboard(body).then(() => {
          broadcast(body);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true }));
        })
      )
      .catch((err) => {
        if (!res.writableEnded) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
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
