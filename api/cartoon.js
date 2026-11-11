const { send, json, rateLimit, geminiRequest, extractText, parseJsonText, capText } = require('../server-utils');

const SYSTEM = `You are ArixCartoon's animation story director. Create ORIGINAL, drawable 2D cartoon storyboards, not image/video prompts. Return one strict JSON object and no markdown. The renderer is a JavaScript 2D pencil rig, so give clear simple actions that can be communicated with body pose, face, props, camera framing and background setting. Characters must be reusable and visually consistent. Keep dialogue speakable and compact. Do not invent more than 4 characters. Avoid copyrighted character names or imitating a living artist's exact style.`;
const SCHEMA_GUIDE = `JSON shape:
{
 "title":"short film title",
 "characters":[{"id":"char-1","name":"Name","role":"story role","description":"distinctive appearance / personality","personality":"short trait","emotion":"curious|happy|sad|angry|surprised|calm|excited","color":"#hex shirt color","hairColor":"#hex hair color","voice":"Kore|Puck|Charon|Aoede|Fenrir|Leda|Orus|Zephyr"}],
 "scenes":[{"id":"scene-1","title":"short title","setting":"one drawable environment, e.g. school room at night","action":"one clear visible action with prop or gesture","camera":"wide shot|medium shot|close-up|tracking shot","emotion":"curious|happy|sad|angry|surprised|calm|excited","duration":7,"characters":["char-1"],"narration":"spoken narration, 1-2 short sentences","dialogue":[{"speaker":"character name","text":"spoken line","emotion":"happy"}]}]
}
Constraints: 4-8 scenes; scene durations sum close to requested length; minimum 3 seconds per scene; characters must be referenced by id in scenes; character IDs stable; 1-3 speaking turns per scene; narration/dialogue should fill only the requested length; no blank text; simple actions drawable with 2D rigs; visual variation; create a hook in scene 1, clear progression and satisfying payoff. For a short video, prefer 4-6 scenes. Use target language code and mood. Keep narration/dialogue under 900 total characters for 30-60s and under 1500 for 90s.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  if (!rateLimit(req, res, 'cartoon', 15)) return;
  const body = json(req);
  const action = body.action || 'generate';
  const prompt = capText(body.prompt, 1800).trim();
  if (prompt.length < 8) return send(res, 400, { error: 'Please provide a story prompt with at least 8 characters.' });
  const style = capText(body.style || 'pencil', 30);
  const tone = capText(body.tone || 'Warm & uplifting', 60);
  const language = capText(body.language || 'en-IN', 20);
  const duration = Math.max(30, Math.min(90, Number(body.duration) || 45));
  try {
    if (action === 'rewriteScene') {
      const scene = body.scene || {};
      const instruction = `Rewrite ONLY this existing scene to make it more engaging and clearly drawable. Preserve its narrative function, character IDs, and approximate duration. Do not create a new story. User's full story idea: ${prompt}\nExisting scene JSON: ${JSON.stringify(scene).slice(0, 5000)}\nCharacters: ${JSON.stringify(body.characters || []).slice(0, 3000)}\nStyle: ${style}; mood: ${tone}; language: ${language}. Return JSON with one key called scene containing the same scene shape.`;
      const result = await geminiRequest(process.env.GEMINI_MODEL || 'gemini-3.8-flash', { systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: instruction }] }], generationConfig: { maxOutputTokens: 2200, responseMimeType: 'application/json' } }, { timeoutMs: 60000 });
      const data = parseJsonText(extractText(result));
      if (!data.scene || typeof data.scene !== 'object') throw new Error('The scene rewrite response was incomplete.');
      return send(res, 200, { scene: data.scene, model: process.env.GEMINI_MODEL || 'gemini-3.8-flash' });
    }
    const instruction = `Create a complete animated cartoon storyboard from this prompt:\n${prompt}\n\nTarget length: ${duration} seconds. Style: ${style}. Mood: ${tone}. Language: ${language}. Frame format: ${capText(body.aspectRatio || '16:9', 10)}. Target 4-8 scenes and 1-4 consistent characters. Make the visuals specific enough for a procedural 2D pencil character renderer, but don't describe impossible cinematic effects. Every scene must have a meaningful visible action. The combined narration and dialogue should be short enough to speak naturally in approximately ${duration} seconds. Follow this exact JSON shape:\n${SCHEMA_GUIDE}`;
    const result = await geminiRequest(process.env.GEMINI_MODEL || 'gemini-3.8-flash', { systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: instruction }] }], generationConfig: { maxOutputTokens: 6000, responseMimeType: 'application/json' } }, { timeoutMs: 90000 });
    const project = parseJsonText(extractText(result));
    if (!Array.isArray(project.scenes) || !project.scenes.length) throw new Error('The storyboard had no scenes. Please retry.');
    project.scenes = project.scenes.slice(0, 8);
    project.characters = Array.isArray(project.characters) ? project.characters.slice(0, 4) : [];
    if (!project.characters.length) project.characters = [{ id: 'char-1', name: 'Story guide', role: 'main character', description: 'A curious, expressive cartoon guide.', emotion: 'curious', color: '#d9b79e', hairColor: '#454039', voice: 'Kore' }];
    const characterIds = new Set(project.characters.map(c => String(c.id)));
    project.scenes = project.scenes.map((scene, i) => ({
      ...scene,
      id: capText(scene.id || `scene-${i + 1}`, 70),
      title: capText(scene.title || `Scene ${i + 1}`, 80),
      setting: capText(scene.setting || 'A hand-drawn setting', 100),
      action: capText(scene.action || 'The character moves through the scene.', 500),
      duration: Math.max(3, Math.min(30, Number(scene.duration) || Math.round(duration / project.scenes.length))),
      narration: capText(scene.narration || '', 850),
      dialogue: Array.isArray(scene.dialogue) ? scene.dialogue.slice(0, 6).map(d => ({ speaker: capText(d.speaker || 'Narrator', 40), text: capText(d.text || '', 600), emotion: capText(d.emotion || scene.emotion || 'calm', 30) })) : [],
      characters: Array.isArray(scene.characters) ? scene.characters.map(x => String(x)).filter(x => characterIds.has(x)).slice(0, 4) : []
    }));
    return send(res, 200, { project: { ...project, prompt, style, tone, language, aspectRatio: capText(body.aspectRatio || '16:9', 10), fps: Number(body.fps) || 24 }, model: process.env.GEMINI_MODEL || 'gemini-3.8-flash' });
  } catch (error) {
    console.error('ArixCartoon storyboard error:', error.message);
    return send(res, error.status || 502, { error: error.message || 'Storyboard generation failed. Please try again.' });
  }
};
