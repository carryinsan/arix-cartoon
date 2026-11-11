const { send, json, rateLimit, geminiRequest, capText } = require('../server-utils');
function pcmToWav(pcm, sampleRate = 24000, channels = 1) {
  const header = Buffer.alloc(44);
  const dataSize = pcm.length;
  header.write('RIFF', 0); header.writeUInt32LE(36 + dataSize, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22); header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28); header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  if (!rateLimit(req, res, 'tts', 10)) return;
  const body = json(req);
  const lines = Array.isArray(body.lines) ? body.lines.slice(0, 80).map(l => ({ speaker: capText(l.speaker || 'Narrator', 40).trim() || 'Narrator', text: capText(l.text || '', 600).trim() })).filter(l => l.text) : [];
  if (!lines.length) return send(res, 400, { error: 'No dialogue or narration was supplied.' });
  const combined = lines.map(l => `${l.speaker}: ${l.text}`).join('\n');
  if (combined.length > 3200) return send(res, 413, { error: 'Voice script is too long. Keep it under 3,200 characters and split longer cartoons into shorter voice tracks.' });
  const defaultVoice = capText(body.voice || 'Kore', 24);
  const availableVoices = new Set(['Kore', 'Puck', 'Charon', 'Aoede', 'Fenrir', 'Leda', 'Orus', 'Zephyr']);
  const speakerMap = body.speakers && typeof body.speakers === 'object' ? body.speakers : {};
  const names = [...new Set(lines.map(l => l.speaker))].slice(0, 4);
  const multiSpeaker = names.length > 1;
  const voiceConfig = multiSpeaker ? {
    multiSpeakerVoiceConfig: { speakerVoiceConfigs: names.map((speaker, i) => ({ speaker, voiceConfig: { prebuiltVoiceConfig: { voiceName: availableVoices.has(speakerMap[speaker]) ? speakerMap[speaker] : (i === 0 ? defaultVoice : 'Puck') } } })) }
  } : { voiceConfig: { prebuiltVoiceConfig: { voiceName: availableVoices.has(speakerMap[names[0]]) ? speakerMap[names[0]] : defaultVoice } } };
  const language = capText(body.language || 'en-IN', 20);
  const ttsModel = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
  try {
    const prompt = `Synthesize the following cartoon dialogue as natural expressive speech. Speak only the dialogue text, using the speaker labels to switch voices; do not read the speaker labels aloud. Language and locale: ${language}. Use clear diction, warm performance, natural pauses, and consistent character voices.\n\n${combined}`;
    const result = await geminiRequest(ttsModel, { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { languageCode: language, ...voiceConfig } } }, { timeoutMs: 90000 });
    const parts = result?.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(p => p.inlineData?.data || p.inline_data?.data);
    const audioData = audioPart?.inlineData?.data || audioPart?.inline_data?.data;
    if (!audioData) throw new Error('Gemini TTS returned no audio data. Try another voice or a shorter script.');
    let raw = Buffer.from(audioData, 'base64');
    // Gemini native TTS normally returns raw 24 kHz mono PCM. Preserve a WAV result if it is already a RIFF file.
    const isWav = raw.length > 12 && raw.toString('ascii', 0, 4) === 'RIFF';
    const wav = isWav ? raw : pcmToWav(raw, 24000, 1);
    if (wav.length > 3_250_000) return send(res, 413, { error: 'Generated audio is too large for a single Vercel function response. Shorten the script or render it scene by scene.' });
    return send(res, 200, { audioBase64: wav.toString('base64'), mimeType: 'audio/wav', model: ttsModel, sampleRate: 24000, multiSpeaker, audioBytes: wav.length });
  } catch (error) {
    console.error('ArixCartoon TTS error:', error.message);
    return send(res, error.status || 502, { error: error.message || 'Speech generation failed.' });
  }
};
