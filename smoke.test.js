'use strict';
const assert = require('node:assert/strict');
const { geminiRequest } = require('./server-utils');
const cartoonRoute = require('./api/cartoon');
const ttsRoute = require('./api/tts');

async function run() {
  // Short prompts must be accepted and must not leave the editor without a story
  // when no Gemini credentials are configured.
  const saved = ['GEMINI_KEY', 'GEMINI_KEY2', 'GEMINI_KEY3'].map(k => process.env[k]);
  for (const key of ['GEMINI_KEY', 'GEMINI_KEY2', 'GEMINI_KEY3']) delete process.env[key];
  const response = {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = value; }
  };
  await cartoonRoute({ method: 'POST', headers: { 'x-forwarded-for': '127.0.0.1' }, body: { prompt: 'a student going in school' } }, response);
  assert.equal(response.statusCode, 200, 'short prompt should receive a usable storyboard');
  const payload = JSON.parse(response.body);
  assert.equal(payload.fallback, true);
  assert.equal(payload.source, 'local-fallback');
  assert.ok(payload.project.scenes.length >= 4);
  assert.match(payload.project.title, /School/);

  // A timeout on key slot 1 must rotate to slot 2 rather than aborting early.
  process.env.GEMINI_KEY = 'test-key-1';
  process.env.GEMINI_KEY2 = 'test-key-2';
  process.env.GEMINI_KEY3 = 'test-key-3';
  const oldFetch = global.fetch;
  let calls = 0;
  global.fetch = async (_url, options) => {
    calls += 1;
    if (calls === 1) {
      const error = new Error('simulated timeout');
      error.name = 'AbortError';
      throw error;
    }
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) };
  };
  const apiResult = await geminiRequest('gemini-3.8-flash', { contents: [] }, { timeoutMs: 5000 });
  assert.equal(calls, 2, 'second key should be tried after first key timeout');
  assert.ok(apiResult.candidates);

  // A compact successful Gemini response is normalized into the editor schema.
  const aiProject = {
    title: 'A Student Goes to School',
    characters: [{ id: 'student', name: 'Aarav', role: 'student', description: 'A student with a blue backpack', personality: 'curious', emotion: 'happy', color: '#4a83b8', hairColor: '#382d28', voice: 'Kore' }],
    scenes: [{ id: 'scene-1', title: 'Morning', setting: 'A sunny bedroom', action: 'Aarav wakes up and stretches.', camera: 'wide shot', emotion: 'happy', duration: 8, characters: ['student'], narration: 'Aarav wakes up ready for school.', dialogue: [] }]
  };
  global.fetch = async (_url, options) => {
    const sent = JSON.parse(options.body);
    assert.equal(sent.generationConfig.thinkingConfig.thinkingLevel, 'LOW');
    assert.ok(sent.generationConfig.maxOutputTokens <= 2500);
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(aiProject) }] } }] }) };
  };
  const aiResponse = { statusCode: 0, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { this.body = value; } };
  await cartoonRoute({ method: 'POST', headers: { 'x-forwarded-for': '127.0.0.2' }, body: { prompt: 'a student going in school' } }, aiResponse);
  assert.equal(aiResponse.statusCode, 200);
  const aiPayload = JSON.parse(aiResponse.body);
  assert.equal(aiPayload.source, 'gemini');
  assert.equal(aiPayload.project.scenes.length, 1);
  global.fetch = oldFetch;

  ['GEMINI_KEY', 'GEMINI_KEY2', 'GEMINI_KEY3'].forEach((k, i) => {
    if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i];
  });


  // Gemini multi-speaker TTS accepts exactly two configured speakers.
  // A larger cast must be safely collapsed to two voices rather than erroring.
  process.env.GEMINI_KEY = 'tts-test-key';
  const oldTtsFetch = global.fetch;
  let ttsPayload = null;
  global.fetch = async (_url, options) => {
    ttsPayload = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: Buffer.alloc(960, 0).toString('base64') } }] } }] }) };
  };
  const ttsResponse = { statusCode: 0, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { this.body = value; } };
  await ttsRoute({ method: 'POST', headers: { 'x-forwarded-for': '127.0.0.3' }, body: { lines: [
    { speaker: 'Narrator', text: 'A new day begins.' },
    { speaker: 'Aarav', text: 'Good morning!' },
    { speaker: 'Maya', text: 'Let us go to school.' }
  ], speakers: { Narrator: 'Kore', Aarav: 'Puck', Maya: 'Aoede' }, language: 'en-IN' } }, ttsResponse);
  assert.equal(ttsResponse.statusCode, 200, 'three-speaker script should no longer fail Gemini speaker validation');
  const ttsBody = JSON.parse(ttsResponse.body);
  assert.equal(ttsPayload.generationConfig.speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs.length, 2, 'Gemini TTS config must contain exactly two voice configs');
  assert.deepEqual(ttsPayload.generationConfig.speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs.map(x => x.speaker), ['Aarav', 'Maya'], 'the two character voices should be prioritized over narrator');
  assert.match(ttsPayload.contents[0].parts[0].text, /Aarav: A new day begins/);
  assert.equal(ttsBody.speakerLimitApplied, true, 'larger casts must be labelled as limited to two distinct voices');
  assert.ok(ttsBody.audioBase64);
  let twoSpeakerPayload = null;
  global.fetch = async (_url, options) => {
    twoSpeakerPayload = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: Buffer.alloc(960, 0).toString('base64') } }] } }] }) };
  };
  const twoSpeakerResponse = { statusCode: 0, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { this.body = value; } };
  await ttsRoute({ method: 'POST', headers: { 'x-forwarded-for': '127.0.0.4' }, body: { lines: [
    { speaker: 'Narrator', text: 'A day begins.' }, { speaker: 'Teacher', text: 'Good morning, class.' }
  ], speakers: { Teacher: 'Aoede' }, language: 'en-IN' } }, twoSpeakerResponse);
  assert.equal(twoSpeakerResponse.statusCode, 200);
  assert.deepEqual(twoSpeakerPayload.generationConfig.speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs.map(x => x.speaker), ['Narrator', 'Teacher'], 'narrator plus one character must use two distinct configured voices');
  global.fetch = oldTtsFetch;

  // Frontend contract checks: every literal element lookup must exist in index.html.
  const fs = require('node:fs');
  const path = require('node:path');
  const appSource = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const htmlSource = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const appIds = new Set([...appSource.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]));
  const htmlIds = new Set([...htmlSource.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]));
  const missingIds = [...appIds].filter(id => !htmlIds.has(id));
  assert.deepEqual(missingIds, [], 'all frontend element IDs referenced by app.js must exist');
  assert.match(appSource, /function clearAudio\(\)\{[^}]*if\(state\.project\)\{state\.project\.words=\[\];/,
    'clearing audio before the first project must not dereference null');
  assert.match(appSource, /const empty=\$\('scene-editor'\)/,
    'scene editor must toggle the actual empty-state element');


  // Renderer smoke: exercise all new scene-specific environments and character poses.
  const oldWindow = global.window;
  global.window = {};
  delete require.cache[require.resolve('./cartoon-engine')];
  require('./cartoon-engine');
  const fakeCtx = new Proxy({}, {
    get(target, key) {
      if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (key === 'measureText') return text => ({ width: String(text).length * 9 });
      if (key === 'roundRect') return () => {};
      return (..._args) => {};
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  const fakeCanvas = { width: 1280, height: 720, getContext: () => fakeCtx };
  const visualProject = {
    style: 'pencil',
    characters: [
      { id: 'aarav', name: 'Aarav', color: '#5b91bf', hairColor: '#302923', skinColor: '#c98e6b', hairStyle: 'spiky', faceShape: 'angular', accessory: 'backpack', pantsColor: '#46546b' },
      { id: 'maya', name: 'Maya', color: '#d58c76', hairColor: '#49352f', skinColor: '#edc5a5', hairStyle: 'long', faceShape: 'round', accessory: 'headband', pantsColor: '#5b6655' }
    ],
    scenes: [
      { id: 'bed', title: 'Morning', setting: 'A cozy student bedroom', action: 'Aarav wakes up, sits on the bed and stretches.', duration: 6, camera: 'wide', characters: ['aarav'] },
      { id: 'study', title: 'Packing', setting: 'A home study desk with books and a backpack', action: 'Aarav packs notebooks into his backpack.', duration: 6, camera: 'medium', characters: ['aarav'] },
      { id: 'road', title: 'Walking', setting: 'A leafy neighbourhood street', action: 'Aarav walks along the road; birds fly overhead.', duration: 6, camera: 'tracking', characters: ['aarav'] },
      { id: 'gate', title: 'Greeting', setting: 'A colourful school entrance with a gate', action: 'Aarav waves to Maya, who waves back.', duration: 6, camera: 'wide', characters: ['aarav', 'maya'] },
      { id: 'class', title: 'Class', setting: 'A bright classroom with a blackboard and desks', action: 'Aarav and Maya sit at their desks and open notebooks.', duration: 6, camera: 'medium', characters: ['aarav', 'maya'] }
    ]
  };
  for (let t = 0; t < 30; t += 0.5) {
    global.window.ArixCartoonEngine.renderFrame(fakeCanvas, visualProject, t, { style: 'pencil', captions: true });
  }
  global.window = oldWindow;

  console.log('ArixCartoon smoke tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
