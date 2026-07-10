// 沈度本地服务器 — HTTP + WebSocket + Buttplug玩具控制桥接
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { ButtplugClient, ButtplugNodeWebsocketClientConnector } = require('buttplug');

const PORT = 3000;
const INTIFACE_URL = 'ws://127.0.0.1:' + (process.argv[2] || 12345);

// ===== MIME =====
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// ===== HTTP =====
const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  if (url === '/api/toy-status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      intiface: bpConnected,
      device: deviceReady,
      deviceName: currentDeviceName,
    }));
  }
  const filePath = path.join(__dirname, url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ===== WebSocket（浏览器 <-> 本地服务器） =====
const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  console.log('[浏览器] 已连接');
  ws.send(JSON.stringify({ type: 'toy-status', connected: bpConnected && deviceReady, deviceName: currentDeviceName }));
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'toy-cmd') handleToyCmd(msg, ws);
    } catch (e) {}
  });
  ws.on('close', () => console.log('[浏览器] 断开'));
});

// ===== Buttplug 客户端 =====
let bpClient = null;
let bpConnected = false;
let deviceReady = false;
let currentDeviceName = '';
let vibrator = null;
let stopTimer = null;

async function connectButtplug() {
  try { if (bpClient) { try { await bpClient.disconnect(); } catch (e) {} } } catch (e) {}

  bpClient = new ButtplugClient('Shendu');
  bpConnected = false;
  deviceReady = false;
  currentDeviceName = '';
  vibrator = null;

  bpClient.addListener('deviceadded', (device) => {
    setupDevice(device);
  });

  try {
    console.log('[Intiface] 正在连接', INTIFACE_URL, '...');
    const connector = new ButtplugNodeWebsocketClientConnector(INTIFACE_URL);
    await bpClient.connect(connector);
    bpConnected = true;
    console.log('[Intiface] 握手成功，扫描设备...');
    broadcastStatus();

    // 检查已连接设备
    var devs = bpClient.Devices || bpClient.devices || [];
    if (!Array.isArray(devs)) devs = [];
    devs.forEach(function(d) { setupDevice(d); });

    if (!deviceReady) {
      await bpClient.startScanning();
      console.log('[Intiface] 扫描中...');
      setTimeout(function() {
        var d2 = bpClient.Devices || bpClient.devices || [];
        if (!Array.isArray(d2)) d2 = [];
        d2.forEach(function(d) { setupDevice(d); });
      }, 3000);
    }
  } catch (e) {
    console.log('[Intiface] 连接失败:', e.message);
    bpConnected = false;
    broadcastStatus();
    setTimeout(connectButtplug, 5000);
  }
}

function setupDevice(device) {
  if (deviceReady) return;
  var info = device._deviceInfo || {};
  var hasVibrate = info.DeviceMessages && info.DeviceMessages.ScalarCmd;
  if (hasVibrate) {
    deviceReady = true;
    vibrator = device;
    currentDeviceName = info.DeviceName || '玩具';
    console.log('[玩具] 发现设备:', currentDeviceName);
    broadcastStatus();
  }
}

function broadcastStatus() {
  const s = JSON.stringify({
    type: 'toy-status',
    connected: bpConnected && deviceReady,
    deviceName: currentDeviceName,
  });
  wss.clients.forEach((c) => { if (c.readyState === WebSocket.OPEN) c.send(s); });
}

// ===== 玩具指令 =====
async function handleToyCmd(msg, ws) {
  if (!bpConnected || !deviceReady || !vibrator) {
    ws.send(JSON.stringify({ type: 'toy-error', message: '玩具未连接' }));
    return;
  }
  const cmd = msg.cmd;
  const intensity = Math.max(0, Math.min(1, msg.intensity || 0.5));
  const duration = msg.duration || 0;

  try {
    // 先清掉之前的定时停止
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }

    switch (cmd) {
      case 'vibrate':
        console.log('[玩具] 振动', Math.round(intensity * 100) + '%', duration ? duration + 'ms' : '');
        await vibrator.vibrate(intensity);
        ws.send(JSON.stringify({ type: 'toy-result', cmd: 'vibrate', success: true }));
        if (duration > 0) {
          stopTimer = setTimeout(async () => {
            try { await vibrator.stop(); } catch (e) {}
            stopTimer = null;
          }, duration);
        }
        break;
      case 'stop':
        console.log('[玩具] 停止');
        await vibrator.stop();
        ws.send(JSON.stringify({ type: 'toy-result', cmd: 'stop', success: true }));
        break;
      case 'pulse':
        console.log('[玩具] 脉冲', Math.round(intensity * 100) + '%');
        for (let i = 0; i < 8; i++) {
          if (!bpConnected || !deviceReady) break;
          await vibrator.vibrate(i % 2 === 0 ? intensity : 0);
          await sleep(duration || 300);
        }
        await vibrator.stop();
        ws.send(JSON.stringify({ type: 'toy-result', cmd: 'pulse', success: true }));
        break;
    }
  } catch (e) {
    ws.send(JSON.stringify({ type: 'toy-error', message: e.message }));
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== 全局错误处理 =====
process.on('uncaughtException', function(e) {
  if (e.code === 'ECONNREFUSED') {
    console.log('[Intiface] Intiface 未运行，5秒后重试...');
  } else {
    console.error('[错误]', e.message);
  }
});

// ===== 启动 =====
connectButtplug();

server.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║        🌙 沈度 · 本地服务器          ║');
  console.log('╠══════════════════════════════════════╣');
  console.log('║  本机访问:  http://localhost:' + PORT + '     ║');
  Object.keys(ifaces).forEach((name) => {
    ifaces[name].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        const ip = iface.address;
        console.log('║  iPhone访问: http://' + ip + ':' + PORT + ' '.repeat(Math.max(0, 7 - ip.length)) + '║');
      }
    });
  });
  console.log('╠══════════════════════════════════════╣');
  console.log('║  玩具状态: 等待 Intiface Central...  ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log('使用方法：');
  console.log('1. 启动 Intiface Central（桌面版）');
  console.log('2. Intiface 中连接蓝牙玩具');
  console.log('3. iPhone 连同一WiFi');
  console.log('4. Safari 打开上面的 "iPhone访问" 地址');
  console.log('');
});
