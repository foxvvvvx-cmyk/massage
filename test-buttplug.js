var { ButtplugClient, ButtplugNodeWebsocketClientConnector } = require('buttplug');

var INTIFACE_URL = 'ws://127.0.0.1:' + (process.argv[2] || 12345);

async function main() {
  var client = new ButtplugClient('Test');
  console.log('Connecting to', INTIFACE_URL, '...');
  var connector = new ButtplugNodeWebsocketClientConnector(INTIFACE_URL);
  await client.connect(connector);
  console.log('Connected!');

  var devs = client.Devices || client.devices || [];
  console.log('\nDevice count:', devs.length);
  devs.forEach(function(d, i) {
    console.log('\n=== Device #' + i + ' ===');
    console.log('All keys:', Object.keys(d));
    // Print each key and value (limited)
    Object.keys(d).forEach(function(k) {
      var v = d[k];
      if (typeof v === 'function') console.log('  ' + k + ': [function]');
      else if (typeof v === 'object') console.log('  ' + k + ': ' + JSON.stringify(v).substring(0, 200));
      else console.log('  ' + k + ': ' + v);
    });
  });

  if (devs.length > 0) {
    var d = devs[0];
    // Try to find vibrate method
    console.log('\n=== Trying to vibrate ===');
    if (typeof d.SendVibrateCmd === 'function') {
      console.log('SendVibrateCmd exists, trying...');
      await d.SendVibrateCmd(0.3);
      await new Promise(function(r) { setTimeout(r, 2000); });
      await d.SendStopDeviceCmd();
      console.log('Done!');
    } else if (typeof d.vibrate === 'function') {
      console.log('vibrate() exists, trying...');
      await d.vibrate(0.3);
      await new Promise(function(r) { setTimeout(r, 2000); });
      await d.stop();
      console.log('Done!');
    } else {
      console.log('No vibrate method found. Available methods:');
      Object.keys(d).filter(function(k){return typeof d[k]==='function'}).forEach(function(k){console.log('  '+k)});
    }
  }

  await client.disconnect();
  process.exit(0);
}

main().catch(function(e) { console.error('FATAL:', e.message); process.exit(1); });
