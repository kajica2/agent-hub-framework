# Long-Horizon Plan

Human-authored direction for the agent team. Read at session start.
Agents defer to this when they don't have a more specific instruction.

## 3-year horizon
Build a hub that holds the entire arsenal as a single coordinated runtime.
Anyone — including an agent — can plug in by dropping a project + declaring
its capabilities. The hub grows without manual curation because the agent
team maintains it.

## 12-month horizon
- All 30+ projects from kajica2's arsenal are on the hub as first-class entities
- Agent team has 12 named personas (utility + research + infrastructure)
- Daily research reports flow from HF daily pipeline into hub channels
- Long-horizon loop runs continuously, growing the hub 1-2% per rotation
- Chrome extension is the day-to-day input surface; chat is rare
- Eye & Kairi has 3-5 active engagements powered by hub-deployed helpers

## 90-day horizon (Q3-Q4 2026)
- Ship the long-horizon loop with 8+ agents wired in
- Bootstrap agent walks all 50 repos, produces curated projects.json
- Daily pipeline integration with kaidjuric/daily-pipeline-director-cut
- Chrome extension v1 ships with 7 commands, PR-based dispatch
- Paywall enforcement proven by build script rejecting leak attempts
- Hub page completeness goes from ~20% to ~95%

## This month (September 2026)
- Phase 1 framework repo: PURPOSE, AGENTS, schemas, validate, build
- Phase 1 instance: 24 curated projects.json entries, paywall enforced
- Phase 1 hub: /research/ + /eye-kairi/ + /agents/ + /legacy/
- Phase 1 agents: 8 personas, 1 operational (thumb-collector), 7 stubs
- Phase 1 channels: tech-pulse + agent-chat + daily-reports
- Phase 1 loop: supervisor + 3 agents wired + growth reports
- Phase 1 extension: 7 commands, PR-based dispatch, voice stubbed

## What I'm NOT doing this period
- Building a real recommendation / ranking model (Phase 3)
- Replacing existing projects with rewrites (only add, never remove)
- Making the hub fully reactive to external signals (Phase 2)
- Client-facing Eye & Kairi portal (Phase 2)

## Decisions I'm explicitly making
- Two-entity model: Research + Eye & Kairi, separate surfaces, shared infra
- Bob Mover material is internal-paywalled, never public, enforced in schema
- Agents open PRs, never push to main, CI guards validity
- Components are reusable; controlled vocabulary; cross-linking mandatory
- Long-horizon loop runs continuously; terminates only when growth stalls
- Chrome extension is keyboard-first; chat is for intentional commands only


---

# Project: Hyper Journey ↔ Spatial 3D integration (kajica2/kai-freq-lab)

**Status:** Both layers exist independently. Integration is the bridge.

## What's already in the repo

- `hyper-journey.js` (50KB) — 4D tesseract visualization, frequency-as-preset, camera tours through the tesseract, currently picks nearest preset to camera.
- `hrtf-spatial.js` (15.8KB) — HRTF PannerNode wrapper around `buildGraph()`, supports `off` / `fixed` / `rotating` / `trajectory` modes. Currently decoupled from any navigation.
- `audio-trajectory.js` (7.9KB) — script-based audio trajectories.
- `bls-mode.js` (8.9KB), `chord-mode.js` (12.2KB), `lfo-drift.js` (7.4KB) — other audio modes.

## The integration design (from the user's design doc, restated)

Hyper Journey owns player state (position, velocity, heading, speed, selected/nearest node). It computes derived audio values. Spatial 3D consumes those values. Other audio features (chord-mode, lfo-drift, audio-trajectory) become **downstream consumers** of the same JourneyState.

```
                  ┌──────────────────────────────────┐
                  │       Hyper Journey              │
                  │  - player position / velocity    │
                  │  - movementMode                  │
                  │  - selectedNodeId                │
                  │  - nearestNodeId                 │
                  └─────────────────┬────────────────┘
                                    │ deriveAudioFromJourney(state)
                                    ▼
                  ┌──────────────────────────────────┐
                  │   JourneyState (single source)   │
                  │   - sourcePosition: Vec3         │
                  │   - rotationHz                   │
                  │   - reverbSend                   │
                  │   - filterCutoffHz               │
                  │   - motionAmount                 │
                  │   - nodeBlend                    │
                  └────┬───────────┬──────────┬──────┘
                       │           │          │
                       ▼           ▼          ▼
                  ┌─────────┐ ┌────────┐ ┌────────────┐
                  │HRTF Pan │ │Filters │ │Modulation  │
                  │(hrtf-   │ │(lfo-   │ │(chord-mode,│
                  │ spatial)│ │ drift) │ │ audio-     │
                  └─────────┘ └────────┘ │ trajectory)│
                                        └────────────┘
```

## Locked design decisions (from the doc)

1. **Movement drives spatialization, NOT frequency.** Forward speed → reverbSend + rotationHz + motionAmount. Position.z → reverbSend. Position.y → filterCutoff. Heading → HRTF orientation. Frequency/preset changes only happen at **explicit arrival** or **explicit user selection**, with 1-3s crossfade.

2. **One normalized `JourneyState`** as source of truth. Single function `deriveAudioFromJourney()` produces audio control values.

3. **HRTF as the spatialization primitive.** `panner.panningModel = 'HRTF'`. Smoothing via `setTargetAtTime(value, now, 0.08)` — prevents zipper noise.

4. **Node arrival = preset crossfade.** 1-3s. The JourneyState's `nearestNodeId` changes gradually as the player moves; arrival triggers the crossfade.

5. **Manual override preserved.** Musicians can explore without losing their preset. Default movement → spatialization, NOT frequency changes.

6. **Reduced-motion option.** Defaults: visual entrainment OFF. Safety panel exposes: reduce motion, disable pulses, limit spatial movement, master volume cap.

## Phase 1 deliverables (this integration)

**Goal:** a working bridge between the two existing layers. Player moves through 4D tesseract, audio source pans in 3D HRTF, effects (reverb, filter) modulate based on movement, preset changes happen only on node arrival.

Files to write / modify:
- `kai-freq-lab/journey-state.js` (NEW) — the canonical `JourneyState` module. Exports `getState()`, `setState()`, `subscribe()`, `deriveAudioFromJourney()`. Publishes to a custom event.
- `kai-freq-lab/hyper-journey.js` (MODIFY) — extend to write to JourneyState on camera move, on nearest-node change, on user arrival.
- `kai-freq-lab/hrtf-spatial.js` (MODIFY) — extend to subscribe to JourneyState. The 'trajectory' mode becomes "follow JourneyState's `sourcePosition`". The 'rotating' mode becomes "orbit driven by `motionAmount`".
- `kai-freq-lab/preset-crossfade.js` (NEW) — the 1-3s crossfade engine. Subscribes to `nearestNodeId` change events. Smoothly transitions between presets.
- `kai-freq-lab/journey-hud.js` (NEW) — the mini-HUD: current node, nearest node, frequency, current speed, x/y/z, distance, audio-state indicator.
- `kai-freq-lab/safety-controls.js` (NEW) — the safety panel: reduce motion, disable pulses, limit spatial movement, master cap.

## Phase 2 (flagged, not this turn)

- Real persistence: save routes as `JourneyRoute` JSON, replay them
- Multiple character types (avatar options)
- Multiplayer presence (see other players in the same journey)
- Mobile / gamepad input polish
- Pre-baked "guided tours" (curated journeys that visit presets in a designed order)

## Risks called out up front

- The `deriveAudioFromJourney` smoothing constants (0.08s time-constant for setTargetAtTime, 1-3s crossfade) are empirical. They'll need tuning per preset family (drone vs pulse vs chord). Phase 1 ships a default; Phase 2 tunes per family.
- The browser's HRTF impulse responses are platform-specific. macOS Safari and Chrome will sound different. Acceptable for Phase 1; flagged for QA.
- Movement velocity → filterCutoff is **deliberately capped** in the user's design. We will hard-code the cap; we will NOT let it climb to 900Hz + harmonics on a fast sprint.

## Acceptance test (Phase 1)

- Open `freq-lab.vercel.app` (or local dev) with the new integration loaded.
- Click "Enter Hyper Journey".
- The 4D tesseract is visible. Player starts at origin.
- Move the player (WASD or click-to-teleport) — the audio source pans smoothly in 3D HRTF (no zipper noise, no clicks).
- Move forward fast — reverb depth increases, modulation rate increases, filter opens slightly.
- Move toward a node — at threshold distance, the nearest-node indicator shows the node name. On arrival, a 1-3s crossfade to that preset plays.
- Frequency never jumps to a new value during navigation; only on explicit arrival or selection.
- Reduced-motion toggle: visual pulses + spatial movement clamp to zero.
- HUD shows: current node, nearest node, current frequency (Hz), current speed, x/y/z, distance to nearest.


---

# Hyper Journey + Music Video integration — clarification note (2026-09-04)

**The user's latest direction:** start with the integration *working in `music_video.html` directly*, not as a separate Hyper Journey layer. Follow the music. Grow. Create a journey-to-color.

**What I'm reading this as:**
1. `music_video.html` (in Sainted Word Records repo) is the **canonical demo target**. The journey + spatial integration ships there first, not in `kai-freq-lab` standalone.
2. "Follow the music" = the player / camera / journey state is **driven by the audio analysis** of the playing track (spectral features, beats, energy). The user is the listener; the avatar's motion is a function of the music.
3. "Grow and create such a journey to color" = the journey IS the visualization. Movement through the 4D tesseract generates the color (palette mapping position → hue), generates the audio effects (movement → reverb/filter/HRTF), and feeds back into the visual layer (color drives the SWR engine's blend modes / hue layers).

**Why this matters:** in the original design, the player moves and the audio reacts. In this new direction, the audio is primary and the player follows it. The state flow inverts.

**New direction (proposed):**
```
   audio analysis (FFT, beats, energy)
            │
            ▼
   JourneyState (player position derived from audio)
            │
            ▼
   ┌────────────┬─────────────┐
   │            │             │
   ▼            ▼             ▼
 HRTF pan    color/hue    effects mod
   │            │             │
   └────────────┴─────────────┘
                │
                ▼
       music_video.html render
```

**Open questions before code:**
1. Is `music_video.html` in the **SWR repo** (`~/Documents/Sainted_/`) the target, or the one in **kai-freq-lab** (if it exists)?
2. Should the player motion be **purely audio-driven** (no user input), or **user-modulated audio** (default audio, but the user can steer the camera)?
3. "Journey to color" — does this mean the color palette of the music video evolves over the journey, or that color IS the visualization of position (different positions = different palettes)?

**Status:** Not building code yet. Need clarification on (1), (2), (3) before scaffolding.



---

# Project: Audio-driven Journey in make-video.html (SWR)

**Target file:** `~/Documents/Sainted_/make-video.html` (canonical: `https://sainted-word-records.vercel.app/make-video.html`)
**Live URL:** the music-video maker is the public demo; integration ships here first.

## The user's intent (locked)

- Player motion in the 4D tesseract = derived from **audio analysis** (FFT bands, beat energy, spectral centroid, onset detection)
- User can **steer** the camera; their input **modulates** but doesn't replace the audio-driven baseline
- Color evolves **subtly** over the journey — no arcade palettes, no per-region color locks. Slow drift. Musical, not flashy.

## Data flow (corrected from original design)

```
   audio analysis (FFT, beats, energy, spectral centroid)
            │
            │  baselineJourneyMotion(audioFrame)
            ▼
   JourneyState (player position/velocity/heading)
            │
            │  + user input (mouse drag, WASD if active)
            │
            ▼
   derived audio values (HRTF pos, filterCutoff, reverbSend, motionAmount)
            │
            │  + subtle color drift (palette blend over time)
            ▼
   make-video.html render layer (hues fed into existing blend modes)
```

## The baselineJourneyMotion function

A pure function that takes an audio frame and returns a Vec3 delta:

```js
function baselineJourneyMotion(frame) {
  // frame = { fftBands: [bass, lowMid, mid, highMid, high],
  //           energy: 0..1, beat: bool, spectralCentroid: 0..1 }
  const t = frame.timeSec;

  // Bass = forward / depth drift (slow, smooth)
  // Energy = lateral X drift
  // Spectral centroid = vertical Y position
  // Beat onset = velocity bump (impulse)
  // Continuous low-frequency wander from time alone (always alive)

  return {
    dx:  frame.fftBands[0] * 0.04 * (Math.sin(t * 0.13) + 1),
    dy: (frame.spectralCentroid - 0.5) * 0.03,
    dz:  frame.fftBands[1] * 0.05 - frame.energy * 0.02,
    speed: frame.energy,
    beatPulse: frame.beat ? 0.3 : 0,
  };
}
```

The motion is **always present** (sin term + centroid term) so even silence feels alive, but **grows with audio intensity** when music plays.

## User steering

User mouse drag / arrow keys add a delta on top of the baseline. Steer input decays with time-constant 0.4s so releasing the input smoothly returns control to audio.

```js
function steerDecay(userSteer, dt) {
  const decay = Math.exp(-dt / 0.4);
  return { x: userSteer.x * decay, y: userSteer.y * decay };
}
```

## Subtle color drift

The render layer has hue knobs. Journey position nudges them, but with hard caps:
- Per-frame hue delta: max ±0.5° (sub-perceptual at 60fps but visible over 10s)
- Saturation nudge: ±0.02 (subtle, not saturated arcade)
- Brightness drift: ±0.05 (matches motion amplitude)

Color drift is **NOT** a position-to-color mapping. It's a function of:
- Time elapsed in the journey
- Current energy level (drives brightness slightly)
- Cumulative motion (drives hue rotation)

A user sitting still sees color shift slowly. A user moving fast sees color shift faster. Always subtle.

```js
function deriveColorDrift(journeyState, audioEnergy) {
  const t = journeyState.timeSec;
  const motionMagnitude = Math.hypot(
    journeyState.player.velocity.x,
    journeyState.player.velocity.y,
    journeyState.player.velocity.z,
  );
  return {
    hueOffsetDeg:    (t * 1.2 + motionMagnitude * 30) % 360,  // slow rotation
    saturationBoost:  Math.min(audioEnergy * 0.15, 0.02),     // capped subtle
    brightnessBoost:  Math.min(motionMagnitude * 0.08, 0.05),  // capped subtle
  };
}
```

## Files to write / modify

1. **`Sainted_/make-video.html`** (MODIFY) — add journey canvas overlay (4D-tesseract WebGL, simplified, ~280px square in corner) + inject audio analysis → JourneyState → derive → render hooks.
2. **`Sainted_/lib/journey-bridge.client.js`** (NEW) — audio analysis + JourneyState + baseline motion + user steer + color drift. ~200 lines.
3. **`Sainted_/lib/journey-bridge.css`** (NEW) — overlay styling for the journey canvas + tiny HUD.
4. **`Sainted_/lib/journey-mini-gl.js`** (NEW) — minimal 4D tesseract WebGL renderer. Reuses math from `hyper-journey.js` but stripped to ~150 lines and HUD-sized.

## Phase 1 acceptance test

- Open `https://sainted-word-records.vercel.app/make-video.html` (or local dev) with the integration loaded.
- Drop in a song.
- The journey canvas in the corner shows the 4D tesseract, slowly rotating.
- As audio plays, the player's position drifts in the tesseract (forward when bass hits, lateral when energy is high, vertical when treble is bright).
- On beat onset, the player gets a small velocity pulse (visible as a brief motion blur).
- Mouse drag in the canvas adds a steer offset; releasing smoothly returns control to audio.
- The render layer's hues drift slowly over time — perceptually present but never arcade.
- Silence = journey keeps drifting (sin term) but at low amplitude.
- Reduced-motion toggle: removes the journey canvas entirely + clamps color drift to zero.

## Risks

- Audio analysis may compete with existing SWR engine's analyser. Need to share the AnalyserNode or get a second tap.
- Adding a 4D tesseract WebGL canvas on top of the existing canvas/SVG layers needs z-index discipline.
- "Subtle" is subjective. Phase 1 ships a default; Phase 2 exposes a slider.

## What this turn delivers

Scaffolding the bridge, integrating into make-video.html, accepting audio features + user steer + subtle color. Local dev server runs at `:5174` (existing Vite config). One commit. Browser-verified (you do the visual check, since my browser harness is blocked).



---

# make-video.html: corrected layering (2026-09-04, after user clarification)

**Reframing:** the 4D tesseract is NOT a visible overlay. The journey IS the modulation of the existing render. Three layers, top to bottom:

## Layer 3 (very subtle, normally invisible)
**The journey effects.** They ride on the existing picture as nudges:
- Intensity nudge (contrast / brightness ±0.05 max)
- Movement nudge (pan/zoom of the canvas, ~0.5% per second max)
- Color nudge (hue drift, ±1.2°/sec max)
- Subtle "breathing" — the picture expands/contracts by 0.3% on bass hits

This layer is normally invisible to the casual viewer. They feel the picture *alive* without seeing why. A musician or designer notices and learns to read it.

## Layer 2 (alpha 20% by default, becomes editable in "create" mode)
**The user's playground.** They can drop in:
- Shapes (2D SVG, 3D JS via three.js or raw WebGL)
- Custom shaders
- Sound-reactive particle systems
- Anything that takes `audioFeatures` as input

By default this layer is at 20% opacity — visible enough to know it's there, subtle enough not to dominate. When the user enters **create mode** (a button/toggle in the UI), the alpha layer brightens to 60-80% so they can edit/position/script it.

## Layer 1 (bottom, always visible)
**The SWR engine's existing render.** Audio-reactive layered composition. This is what the user came to the page to see. Untouched.

## The journey state (no visible canvas)

The player position/velocity lives in state but isn't drawn. It's the *modulation source* for Layer 3's nudges and a *control source* for Layer 2's experiments (each user-placed shape can subscribe to specific audio features).

```
   audio analysis
        │
        ▼
   JourneyState (player pos/vel derived from audio)
        │
        ├─► Layer 3 nudges (intensity, movement, color, breathing)
        │
        └─► Layer 2 user experiments (their JS reads from JourneyState)
```

## Files to write / modify

1. **`Sainted_/make-video.html`** (MODIFY) — restructure with explicit three layers in the markup. Inject journey-bridge + alpha-layer shells.
2. **`Sainted_/lib/journey-state.client.js`** (NEW) — the canonical state + audio analysis. Publishes events. ~150 lines.
3. **`Sainted_/lib/journey-effects.client.js`** (NEW) — the Layer 3 subtle effects. Pure functions that read JourneyState + write CSS custom properties / canvas transforms. ~120 lines.
4. **`Sainted_/lib/alpha-layer.client.js`** (NEW) — the Layer 2 playground + create-mode editor. ~250 lines.
5. **`Sainted_/lib/journey-state.css`** (NEW) — minimal styling for the alpha layer shell + create-mode toggle.

## Phase 1 acceptance

- Open make-video.html with the integration loaded.
- Drop in a song.
- The picture breathes with the music: tiny intensity/movement/color nudges you can feel but not see.
- Bass hits → 0.3% scale pulse.
- Energy rises → color drift accelerates subtly.
- Press "Create" toggle → a 20%-opacity alpha canvas appears, editable.
- Without create mode, the alpha layer is barely visible (20% opacity, faint outline).
- Reduced-motion: removes the breathing pulse, clamps color drift to 0, alpha layer stays at 5% opacity.

## Risks

- Existing SWR engine may already use CSS custom properties for its own color/intensity. Naming collisions possible. Will audit before scaffolding.
- The 20% alpha is opinionated. Users with low vision may want it higher or lower. Phase 2 exposes slider.
- "Create mode" is a new UX surface. Default-on or default-off? Default-OFF + visible button (matches the user's "won't be visible but you can enable" phrasing).

## What "very slow slowly" means numerically

- Color drift: 1.2° per second of hue rotation. Over a 4-minute track, ~288° total rotation. Subtle enough that you only notice on second view.
- Intensity breathing: 0.3% scale on bass onset, decays over 1.5s. So the picture "breathes" but never appears to pulse.
- Movement nudge: 0.5% pan/zoom per second of cumulative motion. Almost imperceptible.
- These are ceilings — actual values are computed from the audio and clamp below.

