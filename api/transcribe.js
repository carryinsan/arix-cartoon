const { send, json, rateLimit, geminiRequest, extractText, decodeBase64Audio } = require('../server-utils');
function findWordAnnotations(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) { for (const x of value) findWordAnnotations(x, out); return out; }
  const word = value.word || value.text || value.content;
  const start = value.startTime ?? value.start_time ?? value.start ?? value.startOffset ?? value.start_offset;
  const end = value.endTime ?? value.end_time ?? value.end ?? value.endOffset ?? value.end_offset;
  if (typeof word === 'string' && start != null && end != null) {
    const toSec = (v) => typeof v === 'string' && v.endsWith('s') ? Number(v.slice(0,-1)) : typeof v === 'object' && v.seconds != null ? Number(v.seconds) + Number(v.nanos || 0)/1e9 : Number(v);
    const s = toSec(start), e = toSec(end);
    if (Number.isFinite(s) && Number.isFinite(e)) out.push({ word, start: s, end: e, speaker: value.speaker || value.speakerLabel || 'Narrator' });
  }
  for (const [key, v] of Object.entries(value)) if (key !== 'word' && key !== 'text' && key !== 'content') findWordAnnotations(v, out);
  return out;
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  if (!rateLimit(req, res, 'transcribe', 12)) return;
  const body = json(req);
  try {
    const audio = decodeBase64Audio(body.audioBase64, 3_300_000);
    const mimeType = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/m4a'].includes(String(body.mimeType || '').toLowerCase()) ? String(body.mimeType).toLowerCase() : 'audio/wav';
    const model = process.env.GEMINI_TRANSCRIBE_MODEL || 'gemini-3.5-transcribe';
    const result = await geminiRequest(model, {
      contents: [{ parts: [{ text: 'Transcribe the supplied audio verbatim. Preserve the exact spoken words. Return word-level timestamps and speaker labels when possible.' }, { inlineData: { mimeType, data: audio.toString('base64') } }] }],
      generationConfig: { audioTranscriptionConfig: { wordTimestamp: true, diarization: true, languageCodes: body.language ? [String(body.language).slice(0, 20)] : [] } }
    }, { timeoutMs: 90000 });
    const transcript = extractText(result);
    const words = findWordAnnotations(result);
    // Some REST responses include timestamp data in text/annotations; never fabricate exact timestamps here.
    return send(res, 200, { transcript, words, timestampMode: words.length ? 'model-annotations' : 'not-returned', model });
  } catch (error) {
    console.error('ArixCartoon transcription error:', error.message);
    return send(res, error.status || 502, { error: error.message || 'Word-level transcription failed.' });
  }
};
