// ElevenLabs TTS proxy — Vercel serverless function
var https = require('https');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET = health check
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      hasKey: !!process.env.ELEVENLABS_API_KEY,
      keyLen: (process.env.ELEVENLABS_API_KEY || '').length,
      voiceId: '1qP1IT2KK9sfKcWA3KYf',
      nodeVersion: process.version
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel may provide body as string or already parsed
  var body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  var text = (body && body.text) || '';
  var voiceId = (body && body.voiceId) || '1qP1IT2KK9sfKcWA3KYf';

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  var apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured', hasEnv: !!process.env.ELEVENLABS_API_KEY });
  }

  var postData = JSON.stringify({
    text: text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
  });

  var options = {
    hostname: 'api.elevenlabs.io',
    path: '/v1/text-to-speech/' + encodeURIComponent(voiceId),
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 15000
  };

  return new Promise(function(resolve) {
    var apiReq = https.request(options, function(apiRes) {
      var chunks = [];
      apiRes.on('data', function(c) { chunks.push(c); });
      apiRes.on('end', function() {
        var buf = Buffer.concat(chunks);
        if (apiRes.statusCode === 200) {
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Content-Length', buf.length);
          res.send(buf);
        } else {
          res.status(500).json({ error: 'ElevenLabs returned ' + apiRes.statusCode, detail: buf.toString('utf8').substring(0, 300) });
        }
        resolve();
      });
    });

    apiReq.on('error', function(e) {
      res.status(500).json({ error: 'Request failed: ' + e.message });
      resolve();
    });

    apiReq.on('timeout', function() {
      apiReq.destroy();
      res.status(500).json({ error: 'Request timed out' });
      resolve();
    });

    apiReq.write(postData);
    apiReq.end();
  });
};
