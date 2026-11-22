// The screenshot scenes behind ?shot=cover|route|caught|getaway. Each one
// plays the real rules forward from a fresh world, walking the thief along
// a real route with the game's own step function, then stages the alarm and
// the watchers so the frame shows what a short game really looks like.
// The same seed always gives the same frame.
import { STEP } from './config.js';
import { resetWorld, stepWorld, useEmp, SCREEN_PLAY } from './world.js';

const EMPTY_INPUT = { up: false, down: false, left: false, right: false, sneak: false };

// Walk the thief to `target` in two axis-aligned phases (x, then y), which
// slides along walls instead of wedging into corners. The alarm is held
// down while staging so a staged walk is never caught mid-scene.
function walkTo(world, target, maxSeconds = 40) {
  const steps = Math.floor(maxSeconds / STEP);
  for (let phase = 0; phase < 2; phase += 1) {
    for (let index = 0; index < steps; index += 1) {
      const thief = world.thief;
      const dx = target.x - thief.x;
      const dy = target.y - thief.y;
      const input = { ...EMPTY_INPUT };
      if (phase === 0) {
        if (Math.abs(dx) < 10) break;
        input.left = dx < 0;
        input.right = dx > 0;
      } else {
        if (Math.abs(dy) < 10) break;
        input.up = dy < 0;
        input.down = dy > 0;
      }
      stepWorld(world, input, STEP);
      if (world.screen !== SCREEN_PLAY) return;
      if (world.alarm > 20) world.alarm = 20;
    }
  }
}

function faceGuardAt(guard, x, y) {
  guard.angle = Math.atan2(y - guard.y, x - guard.x);
  guard.baseAngle = guard.angle;
  guard.pause = 99;
  guard.sweepPhase = 0;
  guard.investigate = null;
}

function placeGuard(guard, x, y) {
  guard.x = x;
  guard.y = y;
  guard.investigate = null;
  guard.pause = 99;
  guard.sweepPhase = 0;
}

// Cover: the thief crosses the main hall on the red carpet while Guard Mara's
// cone sweeps onto them, a camera cone crosses the hall, the diamond glows
// in the vault and the alarm meter reads 34% — everything in one frame.
function stageCover(world) {
  walkTo(world, { x: 150, y: 560 });
  walkTo(world, { x: 300, y: 640 });
  walkTo(world, { x: 395, y: 500 });
  walkTo(world, { x: 560, y: 460 });
  const mara = world.level.guards[0];
  placeGuard(mara, 660, 380);
  faceGuardAt(mara, world.thief.x, world.thief.y);
  mara.seenFlash = 0.3;
  const hallCam = world.level.cameras[1];
  hallCam.angle = Math.atan2(world.thief.y - hallCam.y, world.thief.x - hallCam.x);
  hallCam.phase = 0;
  world.alarm = 34;
  world.time = 42;
}

// Route: the thief slips down the east service corridor after an EMP pulse,
// cameras offline, a pearl loot gem ahead, alarm nearly calm.
function stageRoute(world) {
  walkTo(world, { x: 700, y: 700 });
  walkTo(world, { x: 1100, y: 700 });
  walkTo(world, { x: 1210, y: 640 });
  walkTo(world, { x: 1210, y: 560 });
  world.coins = 40;
  useEmp(world);
  world.alarm = 12;
  world.time = 58;
}

// Caught moment: the thief is inside Guard Mara's cone in the main hall,
// the alarm meter is at 86% and a camera has them too.
function stageCaught(world) {
  walkTo(world, { x: 300, y: 640 });
  walkTo(world, { x: 700, y: 640 });
  walkTo(world, { x: 700, y: 300 });
  const mara = world.level.guards[0];
  placeGuard(mara, 620, 300);
  faceGuardAt(mara, world.thief.x, world.thief.y);
  mara.seenFlash = 0.3;
  const hallCam = world.level.cameras[1];
  hallCam.angle = Math.atan2(world.thief.y - hallCam.y, world.thief.x - hallCam.x);
  world.alarm = 86;
  world.time = 73;
}

// Getaway: the thief takes the Sunset Diamond through the vault's north door,
// slips out the east door and reaches the EXIT — the win screen, real play.
function stageGetaway(world) {
  walkTo(world, { x: 300, y: 640 });
  walkTo(world, { x: 700, y: 640 });
  walkTo(world, { x: 700, y: 180 });
  walkTo(world, { x: 930, y: 180 });
  walkTo(world, { x: 930, y: 382 });
  walkTo(world, { x: 1090, y: 382 });
  walkTo(world, { x: 1210, y: 382 });
  walkTo(world, { x: 1210, y: 700 });
  walkTo(world, { x: 1222, y: 772 });
}

export function stageShot(name, world) {
  resetWorld(world);
  if (name === 'route') stageRoute(world);
  else if (name === 'caught') stageCaught(world);
  else if (name === 'getaway') stageGetaway(world);
  else stageCover(world);
  return world.screen;
}
