// Screenshot scenes: play the real game from a fresh world, then
// freeze one frame. Scene names: sampul, rute, tertangkap, pelarian.
// Any other name is treated as sampul.

import { STEP } from './config.js';
import { resetWorld, stepWorld, useEmp, SCREEN_PLAYING } from './world.js';

// Walk the thief toward a target in two axis-aligned phases, first
// horizontal then vertical, using synthetic input and fixed steps.
// The two phases share one time budget (default 40 s). A phase ends
// when the thief is within 10 px on that axis. The alarm is held at
// 20 during setup, and walking stops entirely if the world leaves the
// playing screen. If a phase stops making progress (the thief is
// pressed dead-centre against an obstacle), the thief steps sideways
// briefly to slide around it, keeping the same sideways direction
// until the phase moves again — that is how it rounds long walls such
// as the service-corridor divider — and only flips sideways when the
// sideways step itself is blocked.
export function walkTo(world, target, maxTime = 40) {
  const budget = { left: maxTime };
  walkAxis(world, 'x', target.x, budget);
  walkAxis(world, 'y', target.y, budget);
}

function walkAxis(world, axis, target, budget) {
  const input = { up: false, down: false, left: false, right: false, sneak: false, click: null };
  let best = Infinity;
  let sinceBest = 0;
  let sideDir = 1;
  while (budget.left > 0 && world.screen === SCREEN_PLAYING) {
    const cur = axis === 'x' ? world.thief.x : world.thief.y;
    const dist = Math.abs(target - cur);
    if (dist < 10) return;
    if (dist < best - 0.01) {
      best = dist;
      sinceBest = 0;
    } else {
      sinceBest += STEP;
    }
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
    if (sinceBest > 0.6) {
      // Sidestep perpendicular to the phase axis for half a second.
      const perpBefore = axis === 'x' ? world.thief.y : world.thief.x;
      if (axis === 'x') {
        input.up = sideDir < 0;
        input.down = sideDir > 0;
      } else {
        input.left = sideDir < 0;
        input.right = sideDir > 0;
      }
      let burst = 0;
      while (burst < 0.5 && budget.left > 0 && world.screen === SCREEN_PLAYING) {
        stepWorld(world, input, STEP);
        world.alarm = 20;
        budget.left -= STEP;
        burst += STEP;
      }
      const perpAfter = axis === 'x' ? world.thief.y : world.thief.x;
      if (Math.abs(perpAfter - perpBefore) < 10) sideDir = -sideDir;
      sinceBest = 0;
      continue;
    }
    if (axis === 'x') {
      input.left = target < cur;
      input.right = target > cur;
    } else {
      input.up = target < cur;
      input.down = target > cur;
    }
    stepWorld(world, input, STEP);
    world.alarm = 20;
    budget.left -= STEP;
  }
}

// Face a guard at one point, freeze it there for 99 seconds and clear
// any investigation task.
export function pointGuardAt(guard, x, y) {
  guard.angle = Math.atan2(y - guard.y, x - guard.x);
  guard.baseAngle = guard.angle;
  guard.sweepPhase = 0;
  guard.pauseLeft = 99;
  guard.investigate = null;
  guard.investigateLeft = 0;
}

// Move a guard to one position, frozen for 99 seconds with no
// investigation task.
export function placeGuard(guard, x, y) {
  guard.x = x;
  guard.y = y;
  guard.pauseLeft = 99;
  guard.investigate = null;
  guard.investigateLeft = 0;
}

// Prepare one named scene from a fresh world and return the world's
// screen afterwards.
export function prepareShot(name, world) {
  resetWorld(world);
  const thief = world.thief;
  const mara = world.level.guards[0];
  const hallCam = world.level.cameras[1];

  if (name === 'rute') {
    walkTo(world, { x: 700, y: 700 });
    walkTo(world, { x: 1100, y: 700 });
    walkTo(world, { x: 1210, y: 640 });
    walkTo(world, { x: 1210, y: 560 });
    world.coins = 40;
    useEmp(world);
    world.alarm = 12;
    world.time = 58;
  } else if (name === 'tertangkap') {
    walkTo(world, { x: 300, y: 640 });
    walkTo(world, { x: 700, y: 640 });
    walkTo(world, { x: 700, y: 300 });
    placeGuard(mara, 620, 300);
    pointGuardAt(mara, thief.x, thief.y);
    mara.flash = 0.3;
    hallCam.angle = Math.atan2(thief.y - hallCam.y, thief.x - hallCam.x);
    hallCam.phase = 0;
    world.alarm = 86;
    world.time = 73;
  } else if (name === 'pelarian') {
    walkTo(world, { x: 300, y: 640 });
    walkTo(world, { x: 700, y: 640 });
    walkTo(world, { x: 700, y: 180 });
    walkTo(world, { x: 930, y: 180 });
    walkTo(world, { x: 930, y: 382 });
    walkTo(world, { x: 1090, y: 382 });
    walkTo(world, { x: 1210, y: 382 });
    walkTo(world, { x: 1210, y: 700 });
    walkTo(world, { x: 1222, y: 772 });
  } else {
    // sampul (default)
    walkTo(world, { x: 150, y: 560 });
    walkTo(world, { x: 300, y: 640 });
    walkTo(world, { x: 395, y: 500 });
    walkTo(world, { x: 560, y: 460 });
    placeGuard(mara, 660, 380);
    pointGuardAt(mara, thief.x, thief.y);
    mara.flash = 0.3;
    hallCam.angle = Math.atan2(thief.y - hallCam.y, thief.x - hallCam.x);
    hallCam.phase = 0;
    world.alarm = 34;
    world.time = 42;
  }
  return world.screen;
}
