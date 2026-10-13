# Light Rhythm Implementation Plan

> Execute inline with superpowers:executing-plans and test-driven-development.

**Goal:** Build a touch-first, buildless, 30-second induction rhythm game.
**Architecture:** Classic browser scripts expose independently testable engine and records modules; game.js connects SVG/Canvas UI, pointer input and audio. No runtime dependencies.
**Tech Stack:** HTML, CSS, JavaScript, SVG, Canvas, Web Audio, localStorage, Node built-in tests.
**Spec:** ../specs/2026-10-13-induction-game-design.md

## Global Constraints
Android tablet touch; three difficulties; fixed patterns; 30 seconds; scores out of 10,000; local calendar date; local-only delivery with no build.

## Review Focus
Pointer cancellation must stop movement; backgrounding must discard a round; date rollover must reset all difficulties; malformed storage must not break play; repeated end callbacks must not duplicate records.

## Tasks
- [x] 1. Write tests/core.test.js first, observe missing engine/records API failure. Implement engine.js exports Engine, targetAt, DIFFICULTIES; records.js exports createStore and localDate. Test no motion/no induction, reversed current, fixed time scoring, feasible targets, storage corruption/rollover/failure, separate difficulty records. Run node --test tests/core.test.js.
- [x] 2. Create index.html, styles.css, game.js. Build midnight/navy and electric lime rhythm stage; fixed preview notes, actual brightness cursor, target and actual bulb; SVG magnet drag control; practice, countdown, play, result, interrupt flows. Add keyboard and touch cancellation, sound toggle and difficulty chooser. Connect today's records.
- [x] 3. Test browser at tablet landscape and portrait; verify start, controls, end, retry, persistence, sound and console. Review whole implementation, fix findings, rerun relevant tests. Write README.md and create portable ZIP. Show local result.

## Progress
- Planning: approved spec incorporated; proceeding on explicit user instruction to build.
- Workspace: fresh folder, no Git repository; no worktree or commits applicable.
- Task 1 complete: engine/records API tests first failed, then passed. Regression tests cover chart duration, all-time daily max combo beyond recent10, fresh multi-tab records and no illuminated-note credit for a dark bulb.
- Task 2 complete: UI, responsive focused gameplay, touch/mouse/keyboard, audio, lesson dialog, results and daily records connected. Input state regression first failed for held countdown touch, then passed after preserving captured pointer into GO.
- Task 3 complete: 15 tests pass. Separate read-only reviewer identified held countdown touch and stale multi-tab records; both reproduced and fixed. Browser checked landscape 1280×800 and portrait 800×1280, drag, completion, reload persistence, difficulty separation, sound toggle. No browser console errors observed.
- Ruling: use a linear partial-insertion flux model with bounded travel so speed controls brightness consistently; disclose simplification in lesson and README. This does not simulate far-field motion or full magnet traversal.
- Ruling: remain local-only as agreed; no hosting account created and nothing published. Provide source plus a ready-to-open standalone HTML handout.
- Verification limitation: actual Android hardware is unavailable. Browser tool permits HTTP(S) only, so direct file:// opening could not be tested; HTML bundle is checked for self-contained assets and JavaScript syntax.
