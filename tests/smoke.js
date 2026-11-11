'use strict';
const assert = require('node:assert/strict');
const { geminiRequest } = require('../server-utils');
const cartoonRoute = require('../api/cartoon');

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

  // Frontend contract checks: every literal element lookup must exist in index.html.
  const fs = require('node:fs');
  const path = require('node:path');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const htmlSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const appIds = new Set([...appSource.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]));
  const htmlIds = new Set([...htmlSource.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]));
  const missingIds = [...appIds].filter(id => !htmlIds.has(id));
  assert.deepEqual(missingIds, [], 'all frontend element IDs referenced by app.js must exist');
  assert.match(appSource, /function clearAudio\(\)\{[^}]*if\(state\.project\)\{state\.project\.words=\[\];/,
    'clearing audio before the first project must not dereference null');
  assert.match(appSource, /const empty=\$\('scene-editor'\)/,
    'scene editor must toggle the actual empty-state element');

  console.log('ArixCartoon smoke tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
