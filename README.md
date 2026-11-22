# 🌙 The Midnight Vault — a heist game

![Best Heist Game](https://make.fun/badge/best-heist-game-20261122-0559.svg)
![Rank](https://make.fun/badge/best-heist-game-20261122-0559/Halimcuk/best-heist-game-20261122-0559/rank.svg)
![Reward](https://make.fun/badge/best-heist-game-20261122-0559/Halimcuk/best-heist-game-20261122-0559/reward.svg)

Entry for [best-heist-game-20261122-0559 on make.fun](https://make.fun/bounty/best-heist-game-20261122-0559) — referral code `jcrs26fr`.

## The game

One thief. Two guards. Three cameras. One diamond.

**The Midnight Vault** is a complete top-down stealth heist in the Halcyon
Gallery, played offline in a desktop browser from static files — no library,
no network request, all art drawn procedurally on canvas, all sound made with
WebAudio oscillators.

- **The room:** a night gallery with a red-carpet main hall, display cases,
  statues and planters as cover, and a gold-trimmed vault holding the
  **Sunset Diamond**.
- **Three routes to the vault:** the main hall (Guard Mara's patrol), the
  west corridor (a sweeping camera), and the east service corridor (narrow,
  slow, almost unwatched).
- **Guards with vision cones** patrol waypoints, pause to sweep their gaze,
  and hurry when the alarm climbs. **Cameras** sweep their own cones.
  Being seen fills the **alarm meter** — at 100% you are caught.
- **Tools at a cost,** bought with coins stolen along the way: smoke bomb
  (15c, hide in the cloud), EMP pulse (20c, cameras offline), decoy coin
  (10c, thrown with the mouse — a guard goes to check the noise).
- **Sneak** (Shift) moves slowly and fills the alarm half as fast.
- **Win** by grabbing the diamond and slipping out the green EXIT;
  **lose** by letting the alarm hit 100% or being caught red-handed.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak (half alarm, slower) |
| 1 | Smoke bomb (15 coins) |
| 2 | EMP pulse (20 coins) |
| 3 or mouse click | Throw a decoy coin |
| Enter | Start / play again |
| R | Restart |

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshot scenes (used for `screenshots/`, real renders of the game's own
code): `?shot=cover`, `?shot=route`, `?shot=caught`, `?shot=getaway`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored `vendor/makefun-game.ts`.

## Layout

- `game/index.html` — the page, one canvas
- `game/src/config.js` — tuning constants and palette
- `game/src/random.js` — seeded random (reproducible scenes)
- `game/src/level.js` — the gallery floor plan, collision, line of sight
- `game/src/world.js` — patrols, detection, alarm, tools, win/lose
- `game/src/render.js` — all procedural canvas art, HUD and screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — procedural WebAudio sounds
- `game/src/shots.js` — staged screenshot scenes (real play, frozen)
- `game/src/main.js` — boot and the 60 Hz game loop

## License

MIT — see [LICENSE](LICENSE).
