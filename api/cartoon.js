'use strict';
const { send, json, rateLimit, geminiRequest, extractText, parseJsonText, capText } = require('../server-utils');

const SYSTEM = 'You are ArixCartoon, a professional 2D animation director and storyboard artist. Return only valid JSON. Create specific, drawable actions for a reusable but expressive 2D character rig. Give every character a distinctive silhouette, face, skin tone, hairstyle, clothing design and accessory; never make two characters visually interchangeable. Give every scene a different, setting-accurate composition, specific props, staging, camera and physical action. Avoid static standing poses and generic repeated backgrounds. Never request image or video generation.';

function fallbackProject({ prompt, style, tone, language, duration, aspectRatio, fps }) {
  const schoolStory = /\b(student|school|class|classroom|teacher|schoolbus|school bus|homework|uniform|backpack)\b/i.test(prompt);
  const main = {
    id: 'student-1', name: schoolStory ? 'Aarav' : 'Alex', role: 'main character',
    description: schoolStory ? 'A cheerful student with a neat hairstyle, school uniform, backpack and expressive pencil-drawn face.' : 'A friendly, expressive pencil-drawn story character with a consistent outfit and clear gestures.',
    personality: 'curious, hopeful and determined', emotion: 'happy', color: '#5b91bf', hairColor: '#302923', skinColor: '#c98e6b', pantsColor: '#46546b', hairStyle: 'spiky', faceShape: 'angular', accessory: 'backpack', shirtPattern: 'vertical', heightScale: 1, bodyWidth: .94, voice: 'Kore'
  };
  const friend = { id: 'friend-1', name: 'Maya', role: 'school friend', description: 'A friendly student with a simple consistent hairstyle, school uniform and bright expression.', personality: 'warm and encouraging', emotion: 'happy', color: '#d58c76', hairColor: '#49352f', skinColor: '#edc5a5', pantsColor: '#5b6655', hairStyle: 'long', faceShape: 'round', accessory: 'headband', shirtPattern: 'badge', heightScale: .96, bodyWidth: 1.04, voice: 'Puck' };
  const schoolScenes = [
    { title: 'A Bright New Morning', setting: 'A cozy student bedroom in the morning, sunlight entering through a window', action: 'Aarav wakes up, sits on the bed, stretches and smiles as the morning light fills the room.', camera: 'wide shot', emotion: 'happy', narration: 'The morning sun peeked through the window. Aarav jumped out of bed, ready for a brand-new school day.', dialogue: [{ speaker: 'Aarav', text: 'Good morning! I am ready for school.', emotion: 'excited' }], characters: ['student-1'] },
    { title: 'Packing the School Bag', setting: 'A neat home study desk with books, pencils and a school backpack', action: 'Aarav places a notebook, pencil case and lunchbox into the backpack, then checks the bag.', camera: 'medium shot', emotion: 'focused', narration: 'He packed his books, sharpened pencils and lunch. One quick check, and everything was ready.', dialogue: [], characters: ['student-1'] },
    { title: 'Off Along the Road', setting: 'A leafy neighbourhood street with houses, trees and a bright sky', action: 'Aarav walks along the pavement with his backpack bouncing gently; birds fly overhead.', camera: 'tracking shot', emotion: 'excited', narration: 'With his backpack on his shoulders, Aarav set off. Birds chirped as he followed the familiar road to school.', dialogue: [], characters: ['student-1'] },
    { title: 'Friends at the School Gate', setting: 'A colourful school entrance with a gate, signboard and a few trees', action: 'Aarav reaches the school gate and waves to Maya, who waves back with a big smile.', camera: 'wide shot', emotion: 'happy', narration: 'At the school gate, Aarav spotted his friend Maya. The day was already getting better.', dialogue: [{ speaker: 'Maya', text: 'Hi Aarav! Come on, the bell will ring soon.', emotion: 'happy' }, { speaker: 'Aarav', text: 'Coming! Let us go!', emotion: 'excited' }], characters: ['student-1', 'friend-1'] },
    { title: 'A Seat in the Classroom', setting: 'A bright classroom with a blackboard, desks and an open window', action: 'Aarav and Maya enter the classroom, sit at their desks and open their notebooks as the teacher welcomes the class.', camera: 'medium shot', emotion: 'curious', narration: 'Soon they were in class, notebooks open and minds awake. Another day of learning had begun.', dialogue: [{ speaker: 'Aarav', text: 'I wonder what we will learn today!', emotion: 'curious' }], characters: ['student-1', 'friend-1'] }
  ];
  const generalScenes = [
    { title: 'The First Spark', setting: 'A warm, simple everyday setting inspired by the user story', action: 'Alex notices the main situation from the story and reacts with a clear curious expression.', camera: 'wide shot', emotion: 'curious', narration: `It all began with one simple moment: ${prompt.replace(/[.!?]+$/, '')}.`, dialogue: [], characters: ['student-1'] },
    { title: 'Taking the First Step', setting: 'A nearby setting with a few clear props related to the story', action: 'Alex takes a practical first step, moving one important prop and looking determined.', camera: 'medium shot', emotion: 'focused', narration: 'Instead of waiting, Alex decided to take the first small step.', dialogue: [{ speaker: 'Alex', text: 'Let us give this a try!', emotion: 'excited' }], characters: ['student-1'] },
    { title: 'A Small Challenge', setting: 'The same environment with a visible obstacle or unexpected complication', action: 'Alex pauses at a small obstacle, thinks for a moment and tries a different approach.', camera: 'close-up', emotion: 'surprised', narration: 'The plan did not go perfectly. A small challenge appeared, but Alex did not give up.', dialogue: [], characters: ['student-1'] },
    { title: 'A Happy Finish', setting: 'A brighter version of the opening environment', action: 'Alex completes the task, smiles and celebrates the result with an upbeat gesture.', camera: 'wide shot', emotion: 'happy', narration: 'One step at a time, things started to work. Alex smiled, proud of making a start.', dialogue: [{ speaker: 'Alex', text: 'That was worth trying!', emotion: 'happy' }], characters: ['student-1'] }
  ];
  const rows = schoolStory ? schoolScenes : generalScenes;
  const characters = schoolStory ? [main, friend] : [main];
  const perScene = Math.max(4, Math.round(duration / rows.length));
  const scenes = rows.map((scene, i) => ({
    id: `scene-${i + 1}`, ...scene,
    duration: i === rows.length - 1 ? Math.max(4, duration - perScene * (rows.length - 1)) : perScene
  }));
  return {
    title: schoolStory ? 'Aarav’s School Day' : (prompt.slice(0, 48) || 'A Little Story'),
    characters, scenes, prompt, style, tone, language, aspectRatio, fps,
    source: 'local-fallback'
  };
}

function cleanProject(project, values) {
  if (!project || !Array.isArray(project.scenes) || !project.scenes.length) throw new Error('Gemini returned an empty storyboard.');
  project.scenes = project.scenes.slice(0, 8);
  project.characters = Array.isArray(project.characters) ? project.characters.slice(0, 4) : [];
  if (!project.characters.length) project.characters = [{ id: 'char-1', name: 'Story guide', role: 'main character', description: 'A curious, expressive cartoon guide.', emotion: 'curious', color: '#d9b79e', hairColor: '#454039', voice: 'Kore' }];
  const ids = new Set(project.characters.map(c => String(c.id)));
  project.scenes = project.scenes.map((scene, i) => ({
    ...scene,
    id: capText(scene.id || `scene-${i + 1}`, 70),
    title: capText(scene.title || `Scene ${i + 1}`, 80),
    setting: capText(scene.setting || 'A hand-drawn setting', 150),
    action: capText(scene.action || 'The character moves through the scene.', 500),
    camera: capText(scene.camera || 'medium shot', 50),
    emotion: capText(scene.emotion || 'curious', 30),
    duration: Math.max(3, Math.min(30, Number(scene.duration) || Math.round(values.duration / project.scenes.length))),
    narration: capText(scene.narration || '', 850),
    dialogue: Array.isArray(scene.dialogue) ? scene.dialogue.slice(0, 4).map(d => ({ speaker: capText(d.speaker || 'Narrator', 40), text: capText(d.text || '', 450), emotion: capText(d.emotion || scene.emotion || 'calm', 30) })) : [],
    characters: Array.isArray(scene.characters) ? scene.characters.map(String).filter(id => ids.has(id)).slice(0, 4) : []
  }));
  return { ...project, ...values, source: 'gemini' };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' });
  if (!rateLimit(req, res, 'cartoon', 20)) return;
  const body = json(req);
  const action = body.action || 'generate';
  const prompt = capText(body.prompt, 1800).trim();
  if (prompt.length < 3) return send(res, 400, { error: 'Enter at least a few words describing your cartoon.' });
  const values = {
    prompt,
    style: capText(body.style || 'pencil', 30),
    tone: capText(body.tone || 'Warm & uplifting', 60),
    language: capText(body.language || 'en-IN', 20),
    duration: Math.max(20, Math.min(90, Number(body.duration) || 45)),
    aspectRatio: capText(body.aspectRatio || '16:9', 10),
    fps: Math.max(24, Math.min(60, Number(body.fps) || 24))
  };

  if (action === 'rewriteScene') {
    try {
      const instruction = `Rewrite only this scene as valid JSON with a "scene" key. Preserve character IDs and duration. Keep actions drawable and dialogue concise. User instruction: ${prompt}\nScene: ${JSON.stringify(body.scene || {}).slice(0, 2200)}\nCast: ${JSON.stringify(body.characters || []).slice(0, 1200)}\nStyle: ${values.style}; mood: ${values.tone}; language: ${values.language}.`;
      const result = await geminiRequest(process.env.GEMINI_MODEL || 'gemini-3.8-flash', {
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: instruction }] }],
        generationConfig: { maxOutputTokens: 1300, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'LOW' } }
      }, { timeoutMs: 14000, maxAttempts: 3 });
      const data = parseJsonText(extractText(result));
      if (!data.scene || typeof data.scene !== 'object') throw new Error('Gemini did not return a replacement scene.');
      return send(res, 200, { scene: data.scene, model: process.env.GEMINI_MODEL || 'gemini-3.8-flash', source: 'gemini' });
    } catch (error) {
      console.error('ArixCartoon scene rewrite error:', error.message);
      return send(res, error.status || 502, { error: error.message || 'Scene rewrite failed. Please retry.' });
    }
  }

  // Compact instruction + compact JSON keep a one-line idea fast and predictable.
  const instruction = [
    `STORY IDEA: ${JSON.stringify(prompt)}`,
    `Create a ${values.duration}-second ${values.style} cartoon. Mood: ${values.tone}. Spoken language: ${values.language}. Aspect ratio: ${values.aspectRatio}.`,
    'Return one JSON object only. Use 4 or 5 scenes and 1 or 2 recurring characters. Each scene needs: id,title,setting,action,camera,emotion,duration,characters,narration,dialogue. Each character needs: id,name,role,description,personality,emotion,color,hairColor,voice.',
    'Make a clear beginning, progression and satisfying ending. Each scene must show a different physical pose/action (walk, run, sit, bend, wave, point, write, jump, reach, turn, carry, react); never use standing still as the main action twice in a row. Specify a concrete environment with 3-5 recognizable props in setting/action. Use distinct locations when the story changes location. Character IDs must match scene character IDs. Keep narration and dialogue concise (about 65-95 spoken words total for 45 seconds). No markdown.'
  ].join('\n');

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const result = await geminiRequest(model, {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: instruction }] }],
      generationConfig: { maxOutputTokens: 2400, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'LOW' } }
    }, { timeoutMs: 18000, maxAttempts: 3 });
    const project = cleanProject(parseJsonText(extractText(result)), values);
    return send(res, 200, { project, model, source: 'gemini', fallback: false });
  } catch (error) {
    console.error('ArixCartoon storyboard error:', error.message);
    // A timeout/temporary upstream failure should not block the user's preview.
    // Return a truthful local starter storyboard, clearly marked as non-AI fallback.
    const recoverable = !error.status || [408, 425, 429, 500, 502, 503, 504].includes(error.status) || error.code === 'GEMINI_NOT_CONFIGURED';
    if (recoverable) {
      const project = fallbackProject(values);
      return send(res, 200, {
        project,
        model: 'local-storyboard-fallback',
        source: 'local-fallback',
        fallback: true,
        notice: 'Gemini did not respond, so a local starter storyboard was created. Your prompt is preserved. Check the Gemini key/model settings and retry to get an AI-written version.'
      });
    }
    return send(res, error.status || 502, { error: error.message || 'Storyboard generation failed. Check the Gemini model and API keys.' });
  }
};
