// test-intiface.js — 快速诊断脚本，只管连 Intiface
var WebSocket = require('ws');
var port = process.argv[2] || 54817;

console.log('Connecting to Intiface on port ' + port + '...');

var ws = new WebSocket('ws://127.0.0.1:' + port);

ws.on('open', function() {
  console.log('[OK] Connected!');
  console.log('Sending handshake...');
  ws.send(JSON.stringify({
    MessageType: 'RequestServerInfo',
    Id: 1,
    ClientName: 'TestClient',
    MessageVersion: 3
  }));
});

ws.on('message', function(data) {
  console.log('[RECV]', data.toString().substring(0, 300));
});

ws.on('close', function(code, reason) {
  console.log('[CLOSE] code=' + code + ' reason=' + (reason ? reason.toString() : 'none'));
});

ws.on('error', function(e) {
  console.log('[ERROR]', e.message);
});

setTimeout(function() {
  console.log('\n--- 10 seconds elapsed, still connected: ' + (ws.readyState === WebSocket.OPEN));
  if (ws.readyState === WebSocket.OPEN) {
    console.log('Scanning for devices...');
    ws.send(JSON.stringify({ MessageType: 'StartScanning', Id: 2 }));
  }
  setTimeout(function() {
    console.log('Done. Press Ctrl+C to exit.');
    ws.close();
    process.exit(0);
  }, 3000);
}, 10000);
