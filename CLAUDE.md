# Ink Rally: notes for Claude Code

Ink Rally is a minimal mobile rally game drawn like a paper-and-ink cartoon. It's the sister game to Ink Nine (`../ink-nine`) and shares its look, fonts and way of working. It is live at https://ink-rally.vercel.app and testers are playing it.

## Who you're working with
Otis is the designer. He doesn't read code. He judges changes by playing them on his phone.
- Explain every change in plain language: what the player will see and feel, not how the code works.
- Keep replies short. Ask one question at a time when a design decision is his to make.

## How the project is built
- **No build step, no frameworks, no npm packages in the game.** Plain HTML, CSS and JavaScript files served as-is. The only outside code is Supabase's client, loaded from a CDN when the game starts, plus Google Fonts.
- `play/js/config.js` — `VERSION` and the Supabase URL and publishable key. The key is public by design. **Never add a Supabase secret or service key anywhere.**
- `supabase/` — SQL files Otis runs by hand in the Supabase SQL Editor, numbered in order.
- `index.html` — the front page (a car sliding round a loop, and a Play button).
- `play/index.html` — the game page. It loads `styles.css` and then the scripts in `play/js/` **in the order listed there**.
- The scripts are classic scripts that share one global scope. Order matters: a file can only use things defined in files above it *while it is loading*. Calls that happen later (on tap, per frame) can use anything.
- `manifest.webmanifest`, `sw.js`, `icons/` — home-screen install. When you change files the service worker caches, bump `CACHE` in `sw.js`.

| File | What's in it |
|---|---|
| config.js | `VERSION`, Supabase URL and publishable key |
| engine.js | Car constants, surfaces (grip, slide, traction), the stage builder that turns pacenotes into a road, medal times |
| stages.js | All stages, written as pacenotes |
| cars.js | Cars, upgrades, liveries, reward cards, the saved garage, and each car's performance (`perfFor`, `PERF`) |
| render.js | Canvas, ink patterns, the camera (it turns with the car) |
| world.js | Game state `S`, tyre marks, scenery (trees, hay bales, crowds, chevron boards) |
| audio.js | Procedural engine and tyre sounds, knocks, the co-driver's voice |
| ui.js | HUD, pacenote card (just above the wheel), callouts, hints |
| screens.js | Saved bests, stages screen, name and group screen, pause, finish card with rivals, reward picks and leaderboard |
| garage.js | The garage: pick a car, see its upgrades, paint, race number |
| online.js | Supabase sign-in, recording runs, ghost drivers, the stage leaderboard, saving best runs |
| flow.js | Starting a stage, countdown, co-driver calls, splits, deciding reward picks, finish, wrong way, rescue |
| physics.js | Arcade handling (scaled by the car's `PERF`), drift boost, jumps and crests, hay bales, trees and boards, dust |
| input.js | One-thumb steering and braking, arrow keys |
| draw.js | Drawing everything, including every car shape and livery (`drawCarShape`, `paintLivery`) |
| main.js | Main loop, camera, startup (always last) |

## How it drives (arcade, not a simulation)
Otis wants it to feel like an arcade racer, not a realistic one.
- The car drives itself forward. There are no brakes. The thumb steers with the wheel at the bottom of the screen (input.js): it's a solid black ring; a white knob appears where the thumb lands and slides round the rim under it, like an iPod click wheel; the wheel turns from wherever the thumb lands, about 70° is full lock, and it springs back to the centre on release.
- Steering turns the nose at a steady rate at any speed. The car's travel swings round to follow the nose, limited by the surface's grip, so a hard turn becomes a power slide. The slide is capped at about 55°, so the car never spins.
- Drift boost: sliding more than about 15° charges it (0.5 s gives a boost, 1.2 s a super boost). It fires when the car straightens up. Hitting a tree or bumping a bale hard cancels the charge.
- Hay bales on the outside of bends bounce you back with little speed lost. Trees are the only hard stops, and they stand well back from the road.
- The camera zoom is fixed (`camZoom` in main.js), so the car stays the same size on screen at every speed. The car sits a little below the middle (`cam.ay` in render.js), clear of the co-driver card and the wheel.

## Rewards, cars and the garage
- There are no coins or achievements. Like Ink Nine's reward cards: a podium finish earns a pick at the finish (`PICKS` in cars.js: 1st chooses from 3 cards, 2nd from 2, 3rd takes 1).
- A card is an upgrade level for the car just driven, a car not yet owned, or a livery not yet owned, including the driven car's signature livery (`rewardOffer` and `applyReward` in cars.js). Offers try to include one of each kind. The finish card's buttons only appear once every pick is made.
- Upgrades belong to one car, so you upgrade a car by driving it. Won liveries are shared by all cars, except a signature livery (`sig`), which belongs to one car.
- Each car's `stats` multiply the base handling; upgrades add to them in `perfFor`.
- Liveries are ink only (patterns, never colour).

## Stages are pacenotes
A stage in `stages.js` is a list of notes, the way a co-driver reads them: `['S',80]` straight 80 m, `['L',3,90]` left grade 3 turning 90°, a fourth value `1` marks "caution", plus `['crest']`, `['jump']` and `['surf','tarmac']`. Grade 1 is hairpin-tight, 6 is nearly flat out. The road, the co-driver's calls, the crowds, the chevron boards and the medal times all come from this list.
- After editing a stage, check the road doesn't run into itself (see the check in "Every change"), and bump that stage's `rev` if the layout changed.
- Medal times come from the fastest a perfect driver could go (`idealTime`): gold is 12% slower than that, silver 30%, bronze 55%.

## Every change
1. Work on a new branch, never directly on `main`.
2. Bump `VERSION` in `play/js/config.js` (patch for fixes, minor for features) and add a line to `CHANGELOG.md` in plain language.
3. Test locally: run `python -m http.server` in the repo folder and open http://localhost:8000/play/ at a phone size (390 × 844). Arrow keys drive on a computer.
4. If you changed a stage, make sure no two stretches of road more than 80 m apart come within about 30 m of each other.

## Online play (Supabase)
- It's the same Supabase project as Ink Nine, with its own table `rally_runs` (`supabase/01-rally-runs.sql`): one row per player per stage holding their best time, car, paint and number, and `path`, the ghost recording (x, y, heading and height every 0.1 s).
- Players are anonymous Supabase users with a name and an optional group code (`meta.name`, `meta.grp`). Row-level security lets each player write only their own rows. Only runs with the stage's current `rev` and the player's group are shown.
- The five fastest other drivers in your group are raced as ghosts; the finish card shows the top ten in your group.
- **Local play connects to the real Supabase**, so test runs land on testers' leaderboards. Before playing locally, disconnect in the browser console with `NET.ready.then(()=>{NET.sb=null;NET.uid=null;})`, or play in a private group code.
- Any schema change needs a new numbered file in `supabase/` and a clear note to Otis to run it before merging.

## Protect players' saved progress
Progress is kept in the browser's localStorage. An update must never wipe or break it.
- Keys: `inkrally-bests` (per stage id: best time, split times, `rev` of the layout it was set on, and any `old` time from an earlier layout), `inkrally-meta` (`v`, voice on or off, `name`, `grp`), `inkrally-garage` (`v`, the selected `car`, owned `cars` with their `up`grades, `livery` and `number`, won `liveries`; old `coins`, `total` and `ach`ievements from earlier versions are kept but unused).
- Never rename a car, upgrade or livery `id`; they are saved in players' garages.
- Never rename or remove a saved field or a stage `id`. Add new fields with defaults.
- Changing a stage's layout: bump its `rev` in stages.js. Old times are then set aside (kept under `old`) instead of compared. Tell Otis when that happens.

## Look and feel (same as Ink Nine; keep it consistent)
- Paper and ink only: white `#fff` and black `#000`, with grey only for secondary text. Shading is hatching and stippling, never color. Gold, silver and bronze are told apart by ink (solid with a star, hatched, outline).
- Fonts: Fraunces (display, often italic 900) and Figtree (UI).
- Motion follows Disney's principles: squash and stretch, anticipation, follow-through, slow in and out.
- Mobile first, portrait, one thumb. Respect safe areas and `prefers-reduced-motion`.
- Writing: sentence case, short and plain, no jargon.

## Smoke test
- First launch asks for a name and group code; the stages screen then shows "Driving as", the online line, four stages, the voice toggle and the version.
- Start Pinewood: countdown 3, 2, 1, Go; the car drives off by itself; sliding your thumb steers; pulling down brakes.
- Hold a slide through a bend: sparks appear, and straightening up gives "Boost!" with flames.
- The co-driver card and voice call each bend before it arrives; splits show at one and two thirds.
- Finish on the podium: the card says your place and offers reward cards (3, 2 or 1); picking one applies it, the buttons appear, and it's still in the garage after a refresh.
- Clip a hay bale: a soft bounce back onto the road. Hit a tree: the car stops with a knock and shake; "Back on the road" appears and works.
- The finish card shows your time, the medal board, and the best time is kept after a refresh.
- Online: a finished run says "Saved to the leaderboard" and appears in the finish card's leaderboard; friends in the same group appear as ghost cars with name tags.
- No errors in the browser console.
