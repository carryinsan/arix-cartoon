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
  const combinedRaw = lines.map(l => `${l.speaker}: ${l.text}`).join('\n');
  if (combinedRaw.length > 3200) return send(res, 413, { error: 'Voice script is too long. Keep it under 3,200 characters and split longer cartoons into shorter voice tracks.' });
  const defaultVoice = capText(body.voice || 'Kore', 24);
  const availableVoices = new Set(['Kore', 'Puck', 'Charon', 'Aoede', 'Fenrir', 'Leda', 'Orus', 'Zephyr']);
  const requestedVoices = body.speakers && typeof body.speakers === 'object' ? body.speakers : {};
  const allNames = [...new Set(lines.map(l => l.speaker))];
  // Gemini's native multi-speaker endpoint accepts exactly TWO voice configs.
  // Keep every cast name in the dialogue, but route third+ speakers to speaker B.
  const castNames = allNames.filter(name => name.toLowerCase() !== 'narrator');
  // Prefer two actual character voices when narration is also present; narration
  // shares the lead character's voice because this endpoint supports only two voices.
  const aliases = allNames.length > 1
    ? (castNames.length >= 2 ? castNames.slice(0, 2) : allNames.slice(0, 2))
    : allNames.slice(0, 1);
  const speakerAlias = new Map();
  allNames.forEach(name => {
    const castIndex = castNames.indexOf(name);
    if (name.toLowerCase() === 'narrator') {
      speakerAlias.set(name, castNames.length >= 2 ? aliases[0] : aliases[0]);
    } else if (castNames.length === 1 && allNames.length > 1) {
      speakerAlias.set(name, aliases[1]);
    } else {
      speakerAlias.set(name, aliases[Math.min(Math.max(0, castIndex), 1)]);
    }
  });
  const multiSpeaker = aliases.length === 2;
  const voiceFor = (name, i) => {
    const selected = requestedVoices[name] || (i === 0 ? defaultVoice : 'Puck');
    return availableVoices.has(selected) ? selected : (i === 0 ? defaultVoice : 'Puck');
  };
  const voiceConfig = multiSpeaker ? {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: [
        { speaker: aliases[0], voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceFor(aliases[0], 0) } } },
        { speaker: aliases[1], voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceFor(aliases[1], 1) } } }
      ]
    }
  } : { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceFor(aliases[0], 0) } } };
  const speechLines = lines.map(l => ({ ...l, speaker: speakerAlias.get(l.speaker) || aliases[0] }));
  const combined = speechLines.map(l => `${l.speaker}: ${l.text}`).join('\n');
  const language = capText(body.language || 'en-IN', 20);
  const ttsModel = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
  try {
    const prompt = `Synthesize the following cartoon dialogue as natural expressive speech. Speak only the dialogue text, using the speaker labels to switch voices; do not read the speaker labels aloud. Language and locale: ${language}. Use clear diction, warm performance, natural pauses, and consistent character voices.\n\n${combined}`;
    const result = await geminiRequest(ttsModel, { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { languageCode: language, ...voiceConfig } } }, { timeoutMs: 18000, maxAttempts: 3 });
    const parts = result?.candidates?.[0]?.content?.parts || [];
    const audioPart = parts.find(p => p.inlineData?.data || p.inline_data?.data);
    const audioData = audioPart?.inlineData?.data || audioPart?.inline_data?.data;
    if (!audioData) throw new Error('Gemini TTS returned no audio data. Try another voice or a shorter script.');
    let raw = Buffer.from(audioData, 'base64');
    // Gemini native TTS normally returns raw 24 kHz mono PCM. Preserve a WAV result if it is already a RIFF file.
    const isWav = raw.length > 12 && raw.toString('ascii', 0, 4) === 'RIFF';
    const wav = isWav ? raw : pcmToWav(raw, 24000, 1);
    if (wav.length > 3_250_000) return send(res, 413, { error: 'Generated audio is too large for a single Vercel function response. Shorten the script or render it scene by scene.' });
    return send(res, 200, { audioBase64: wav.toString('base64'), mimeType: 'audio/wav', model: ttsModel, sampleRate: 24000, multiSpeaker, audioBytes: wav.length, speakerLimitApplied: allNames.length > 2, speakerNote: allNames.length > 2 ? 'Gemini supports two distinct voices per multi-speaker request; additional cast members share the second configured voice for this track.' : null });
  } catch (error) {
    console.error('ArixCartoon TTS error:', error.message);
    return send(res, error.status || 502, { error: error.message || 'Speech generation failed.' });
  }
};
