# ArixCartoon Studio

A browser-native, dependency-light 2D cartoon studio for Vercel. The archive is intentionally flat at its root: `index.html`, CSS, browser JavaScript, configuration and documentation are at the ZIP root. The only subfolder is `api/`, which Vercel requires for serverless routes.

## Deploy to Vercel (Hobby)

1. Extract the ZIP. Upload the extracted files to the root of a new GitHub repository. Do **not** upload an extra parent folder.
2. Import that repository into Vercel. The project is plain HTML/CSS/JS with Node.js serverless functions; no build command or third-party npm package is required.
3. In **Vercel → Project → Settings → Environment Variables**, add:
   - `GEMINI_KEY` — required Google AI Studio API key.
   - `GEMINI_KEY2` — optional second key used as a fallback.
   - `GEMINI_KEY3` — optional third key used as a fallback.
   - `GEMINI_MODEL` — optional; defaults to `gemini-3.8-flash`.
   - `GEMINI_TTS_MODEL` — optional; defaults to `gemini-3.8-flash-tts`.
   - `GEMINI_TRANSCRIBE_MODEL` — optional; defaults to `gemini-3.5-transcribe`.
4. Set the variables for **Production**, and also Preview if you test preview deployments. Redeploy after saving environment variables.
5. Visit `/api/health`. It should return `{"ok":true,"configured":true,...}`. It never returns the key values.
6. Open the site and use **Generate storyboard**. If no keys are configured, the local sample project and renderer still work.

Never commit real keys to GitHub. Do not put keys in HTML, client-side JavaScript, browser storage, or a public `.env` file. Vercel environment variables are injected into server-side functions only.

## Visual quality and voice fixes (1.1.0)

- Scene-specific environments now distinguish bedrooms, study rooms, classrooms, school entrances/gates, streets, shops, offices and nature settings instead of treating every setting containing the word “school” as a classroom.
- Character rendering now supports distinct skin tones, hair styles, face shapes, accessories, clothing patterns, proportions and trouser colours. Deterministic identity-based traits keep a character visually recognizable when optional fields are absent.
- Motion is action-aware: walking/running has articulated alternating legs and arm swing; scenes can trigger stretching, waving, sitting, writing, bending, pointing and jumping poses. Word activity drives facial mouth movement.
- Added environmental movement (clouds, street birds, celebration flecks and moving road markings), more contextual props, and camera-specific framing. Removed the previous large italic action-description overlay that obscured the artwork.
- Multi-speaker Gemini TTS now sends exactly two voice configurations when multi-speaker mode is enabled. Google Gemini multi-speaker TTS accepts exactly two configured speakers; when a Narrator and two named characters are present, the two character voices are prioritized and Narrator shares the lead character's configured voice. Additional cast members share the second configured voice for that audio render. This avoids the validation error but does not create unlimited distinct simultaneous voices.
- `npm run check` now includes a three-speaker TTS request test and a renderer smoke test exercising multiple environments and action poses.

## Frontend null-reference fixes (1.0.2)

- Clearing or replacing audio before the first project now safely handles `state.project === null`. This affects first-time storyboard generation and the sample-project buttons.
- The storyboard editor now toggles the actual `#scene-editor` empty-state element (the former code referenced a nonexistent `#editor-empty` ID).
- Starting a new project now resets the scene editor, character list, and metrics to their empty states.
- `npm run check` verifies all literal DOM IDs referenced by `app.js` exist in `index.html`, and checks the null guards for these paths.

## Local development

- Install Node.js 20+ and Vercel CLI (`npm i -g vercel`).
- Copy `.env.example` to `.env.local` and fill in your keys.
- Run `vercel dev` from the project root.
- Open the local URL printed by Vercel. Opening `index.html` directly with `file://` only tests the offline renderer; API routes require a local server.
- Run `npm run check` to syntax-check the JavaScript files.

## What is implemented in this ZIP

- Premium responsive studio UI with preview, scene strip, inspector panels, storyboard editor, characters, audio panel, transcript panel, timeline controls, and full-screen preview.
- Prompt-to-storyboard generation through Gemini Flash, with per-key timeouts and fallback across `GEMINI_KEY`, `GEMINI_KEY2`, and `GEMINI_KEY3`. If Gemini is unavailable or times out, `/api/cartoon` returns a clearly labelled local starter storyboard (for example, a student going to school) so the editor can still be used; the UI clearly says it is a local fallback, not Gemini output.
- Structured scene and character data validation/normalization in the browser.
- Local procedural 2D cartoon rendering in Canvas: pencil/paper look, several scene environments, action-aware 2D character rigs, deterministic character-specific visual traits, blinking, expressions, articulated walk/run/sit/stretch/wave/write/bend/point/jump poses, timed multi-action micro-choreography within compound scene actions, contextual props, distinct setting-specific backgrounds, camera framing and animated environmental details.
- Real time-based animation preview and a requested 24/30/60 FPS canvas recording target. Actual achieved frame rate is monitored; the browser/device can fall below the selected target.
- Scene selection, editing, duplication, deletion, reordering, and AI rewrite of a single scene.
- Gemini TTS generation with speaker-labelled dialogue. Multi-speaker TTS is constrained to two distinct voices per request by the Gemini API; extra cast names are deterministically mapped to those two voices to avoid invalid requests.
- Audio WAV playback and word-level transcript request through Gemini 3.5 Transcribe. If timestamp annotations are not returned, the UI uses clearly marked estimated word timings as a fallback.
- Viseme-like mouth movement driven by timed words and speech activity, captions, local project persistence in IndexedDB, project JSON import/export, and browser MediaRecorder video export.
- Progressive errors, bounded 18-second per-key request timeouts, retry across all configured key slots after timeout/quota/transient errors, compact storyboard prompts, local fallback storyboards, input caps, server-side key handling, and basic per-instance rate limits.

## Important capability boundaries (read before launch)

This is a substantial **working 2D studio foundation**, not a finished professional animation suite. The earlier 549-item product wishlist is broader than what can honestly be completed as a single HTML/JS ZIP without an image-generation pipeline, phoneme alignment service, media encoder, persistent cloud database, or extensive animation assets. This ZIP does not pretend otherwise.

Not fully implemented in this build:

- True hand-drawn raster illustration generation, AI-generated bespoke backgrounds, a large polished asset/pose library, or 3D animation. The current drawing engine is procedural Canvas art.
- Studio-grade bone rigging for arbitrary characters, detailed hand animation, fully naturalistic walk/run/prop interaction, collision physics, dynamic clothing/hair simulation, and full scene continuity validation. Current character rigs are procedural 2D rigs with a finite motion vocabulary.
- Exact phoneme-to-viseme alignment. The app requests word timestamps from a transcription model, and maps speech activity to procedural mouth shapes. If word annotations are missing, word timing is estimated and the audio panel labels it accordingly.
- Guaranteed 24 FPS on every device. The renderer requests the selected export rate, but CPU/GPU load, browser throttling, and MediaRecorder implementation determine actual output. The app measures preview FPS rather than claiming a guaranteed rate.
- Guaranteed MP4 export. MediaRecorder exports MP4 only when the browser exposes a compatible MP4 codec. WebM is the standard fallback in Chrome/Edge.
- Frame-accurate non-linear editing, a real keyframe graph editor, waveform editing, frame interpolation, exact audio ducking/mixing, and export resumption after a closed tab.
- Persistent cross-device/cloud project sync, team collaboration, a globally shared rate limiter, authentication, usage billing, and an enterprise abuse-control layer. Current projects are stored in the current browser's IndexedDB.

## API routes

- `GET /api/health` — configuration readiness, no secret values.
- `POST /api/cartoon` — generate a storyboard.
- `POST /api/cartoon` with `{ "action": "rewriteScene", ... }` — rewrite a selected scene.
- `POST /api/tts` — generate WAV speech audio.
- `POST /api/transcribe` — request verbatim audio transcription with word timestamps and speaker diarization where supported.

All AI calls happen server-side. The API key fallback is best-effort: each configured key slot is tried with its own bounded timeout on authentication, quota, network and transient service errors. A timed-out first key no longer aborts the whole rotation. It does not merge quotas or guarantee extra capacity. For storyboard generation, the server returns a clearly labelled local fallback when Gemini is unconfigured or unavailable, rather than making the user wait on a dead request. The in-memory rate limiter is per warm function instance, not a durable global limit; use a persistent rate-limit store before opening a public high-traffic service.

## Timeout and fallback behavior

- `POST /api/cartoon` uses a compact storyboard instruction, a 2,400-token output ceiling, and Gemini 3.8 Flash LOW thinking level to keep simple ideas fast. All API routes are capped at 60 seconds in `vercel.json` to remain compatible with Vercel Hobby configurations.
- Each configured Gemini key gets a separate bounded attempt; an abort on one key proceeds to the next key.
- Temporary upstream failures, timeouts, and missing Gemini configuration produce a visible local starter storyboard. The studio labels this as `local-fallback`; it must not be mistaken for AI-generated output.
- A permanent API/model error (for example an invalid model name) remains a visible error so it can be corrected instead of being hidden.
- Default storyboard model: `gemini-3.8-flash`. This is a current stable model ID in the Gemini model catalog.

## Vercel request/response limits

Vercel Functions impose a 4.5 MB request and response body cap. To stay inside it, this build caps scripts/audio and limits audio size in the API. Long videos should be split into shorter scene or narration batches. A large base64 WAV may still be rejected by the platform before the function can respond, so keep voice tracks short.

## Project structure

```text
index.html
styles.css
app.js
cartoon-engine.js
server-utils.js
package.json
vercel.json
.env.example
.gitignore
README.md
smoke.test.js
api/
  health.js
  cartoon.js
  tts.js
  transcribe.js
```

## Model references

The default model IDs are configurable environment variables. Check the current Gemini API model catalog and feature docs before changing them:

- Gemini model catalog: https://ai.google.dev/gemini-api/docs/models
- Gemini speech generation: https://ai.google.dev/gemini-api/docs/speech-generation
- Gemini audio transcription: https://ai.google.dev/gemini-api/docs/transcribe
- Vercel function duration: https://vercel.com/docs/functions/configuring-functions/duration
- Vercel 4.5 MB payload limit: https://vercel.com/docs/errors/function_payload_too_large
