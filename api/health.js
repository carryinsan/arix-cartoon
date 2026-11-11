const { send, getKeys } = require('../server-utils');
module.exports = (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
  const keys = getKeys();
  return send(res, 200, { ok: true, configured: keys.length > 0, keySlots: keys.length, model: process.env.GEMINI_MODEL || 'gemini-3.8-flash', ttsModel: process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts', transcriptionModel: 'gemini-3.5-transcribe' });
};
