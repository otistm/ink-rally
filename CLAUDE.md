# Ink Rally: notes for Claude Code

Ink Rally is a minimal mobile rally game drawn like a paper-and-ink cartoon. It's the sister game to Ink Nine (`../ink-nine`) and shares its look, fonts and way of working. It is an early prototype and not live yet.

## Who you're working with
Otis is the designer. He doesn't read code. He judges changes by playing them on his phone.
- Explain every change in plain language: what the player will see and feel, not how the code works.
- Keep replies short. Ask one question at a time when a design decision is his to make.

## How the project is built
- **No build step, no frameworks, no npm packages in the game.** Plain HTML, CSS and JavaScript files served as-is. The only outside code is Google Fonts.
- `index.html` — the front page (a car sliding round a loop, and a Play button).
- `play/index.html` — the game page. It loads `styles.css` and then the scripts in `play/js/` **in the order listed there**.
- The scripts are classic scripts that share one global scope. Order matters: a file can only use things defined in files above it *while it is loading*. Calls that happen later (on tap, per frame) can use anything.
- `manifest.webmanifest`, `sw.js`, `icons/` — home-screen install. When you change files the service worker caches, bump `CACHE` in `sw.js`.

| File | What's in it |
|---|---|
| config.js | `VERSION` |
| engine.js | Car constants, surfaces (grip, slide, traction), the stage builder that turns pacenotes into a road, medal times |
| stages.js | All stages, written as pacenotes |
| render.js | Canvas, ink patterns, the camera (it turns with the car) |
| world.js | Game state `S`, tyre marks, scenery (trees, hay bales, crowds, chevron boards) |
| audio.js | Procedural engine and tyre sounds, knocks, the co-driver's voice |
| ui.js | HUD, pacenote card, callouts, hints |
| screens.js | Saved bests, stages screen, pause, finish card |
| flow.js | Starting a stage, countdown, co-driver calls, splits, finish, wrong way, rescue |
| physics.js | Arcade handling, drift boost, jumps and crests, hay bales, trees and boards, dust |
| input.js | One-thumb steering and braking, arrow keys |
| draw.js | Drawing everything |
| main.js | Main loop, camera, startup (always last) |

## How it drives (arcade, not a simulation)
Otis wants it to feel like an arcade racer, not a realistic one.
- The car drives itself forward. The thumb only steers (slide sideways) and brakes (pull down).
- Steering turns the nose at a steady rate at any speed. The car's travel swings round to follow the nose, limited by the surface's grip, so a hard turn becomes a power slide. The slide is capped at about 55°, so the car never spins.
- Drift boost: sliding more than about 15° charges it (0.5 s gives a boost, 1.2 s a super boost). It fires when the car straightens up. Hitting a tree or bumping a bale hard cancels the charge.
- Hay bales on the outside of bends bounce you back with little speed lost. Trees are the only hard stops, and they stand well back from the road.
- The camera keeps the car in the middle of the screen, away from the thumb.

## Stages are pacenotes
A stage in `stages.js` is a list of notes, the way a co-driver reads them: `['S',80]` straight 80 m, `['L',3,90]` left grade 3 turning 90°, a fourth value `1` marks "caution", plus `['crest']`, `['jump']` and `['surf','tarmac']`. Grade 1 is hairpin-tight, 6 is nearly flat out. The road, the co-driver's calls, the crowds, the chevron boards and the medal times all come from this list.
- After editing a stage, check the road doesn't run into itself (see the check in "Every change"), and bump that stage's `rev` if the layout changed.
- Medal times come from the fastest a perfect driver could go (`idealTime`): gold is 12% slower than that, silver 30%, bronze 55%.

## Every change
1. Work on a new branch, never directly on `main`.
2. Bump `VERSION` in `play/js/config.js` (patch for fixes, minor for features) and add a line to `CHANGELOG.md` in plain language.
3. Test locally: run `python -m http.server` in the repo folder and open http://localhost:8000/play/ at a phone size (390 × 844). Arrow keys drive on a computer.
4. If you changed a stage, make sure no two stretches of road more than 80 m apart come within about 30 m of each other.

## Protect players' saved progress
Progress is kept in the browser's localStorage. An update must never wipe or break it.
- Keys: `inkrally-bests` (per stage id: best time, split times, `rev` of the layout it was set on, and any `old` time from an earlier layout), `inkrally-meta` (`v`, voice on or off).
- Never rename or remove a saved field or a stage `id`. Add new fields with defaults.
- Changing a stage's layout: bump its `rev` in stages.js. Old times are then set aside (kept under `old`) instead of compared. Tell Otis when that happens.

## Look and feel (same as Ink Nine; keep it consistent)
- Paper and ink only: white `#fff` and black `#000`, with grey only for secondary text. Shading is hatching and stippling, never color. Gold, silver and bronze are told apart by ink (solid with a star, hatched, outline).
- Fonts: Fraunces (display, often italic 900) and Figtree (UI).
- Motion follows Disney's principles: squash and stretch, anticipation, follow-through, slow in and out.
- Mobile first, portrait, one thumb. Respect safe areas and `prefers-reduced-motion`.
- Writing: sentence case, short and plain, no jargon.

## Smoke test
- Stages screen shows three stages, the how-to box, the voice toggle and the version.
- Start Pinewood: countdown 3, 2, 1, Go; the car drives off by itself; sliding your thumb steers; pulling down brakes.
- Hold a slide through a bend: sparks appear, and straightening up gives "Boost!" with flames.
- The co-driver card and voice call each bend before it arrives; splits show at one and two thirds.
- Clip a hay bale: a soft bounce back onto the road. Hit a tree: the car stops with a knock and shake; "Back on the road" appears and works.
- The finish card shows your time, the medal board, and the best time is kept after a refresh.
- No errors in the browser console.
