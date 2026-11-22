// The Midnight Vault — all gameplay logic: thief movement, guard
// patrols, camera sweeps, detection pressure, the alarm, gadgets,
// loot, and the win/lose conditions.

import {
  ALARM_ALERT,
  ALARM_BONUS_PER_POINT,
  ALARM_CAMERA_RATE,
  ALARM_CAUGHT,
  ALARM_DECAY_RATE,
  ALARM_GUARD_RATE,
  ALARM_TOUCH_RATE,
  ALARM_WARNING,
  CAMERA_CONE_HALF_ANGLE,
  CAMERA_RANGE,
  CAMERA_SWEEP_SPEED,
  DECOY_COST,
  DECOY_DURATION,
  DECOY_INVESTIGATE_DURATION,
  DECOY_THROW_RANGE,
  DIAMOND_SCORE_VALUE,
  EMP_COST,
  EMP_DURATION,
  FLOOR,
  GEM_COIN_VALUE,
  GEM_SCORE_VALUE,
  GUARD_ALERT_SPEED,
  GUARD_CONE_HALF_ANGLE,
  GUARD_CONE_RANGE,
  GUARD_PATROL_SPEED,
  GUARD_RADIUS,
  GUARD_SWEEP_ARC,
  GUARD_SWEEP_FREQUENCY,
  GUARD_WAYPOINT_PAUSE,
  SMOKE_COST,
  SMOKE_DURATION,
  SNEAK_FACTOR,
  STARTING_COINS,
  STEP,
  THIEF_RADIUS,
  THIEF_SNEAK_SPEED,
  THIEF_WALK_SPEED,
  TIME_BONUS_LIMIT,
  TIME_BONUS_PER_SECOND,
} from './config.js';
import { buildLevel, inCone, pushCircleOut, segmentClear } from './level.js';
import { createRng } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'playing';
export const SCREEN_PLAYING = 'playing';
export const SCREEN_WON = 'won';
export const SCREEN_CAUGHT = 'caught';

// Build a fresh world from one numeric seed (default 1).
export function createWorld(seed = 1) {
  const level = buildLevel();
  return {
    seed,
    screen: SCREEN_TITLE,
    level,
    thief: { x: level.start.x, y: level.start.y, angle: 0, sneaking: false },
    alarm: 0,
    coins: STARTING_COINS,
    _score: 0,
    get score() { return this._score; },
    set score(v) { this._score = Math.round(v); },
    lootValue: 0,
    gemsTaken: 0,
    diamondTaken: false,
    time: 0,
    smokeLeft: 0,
    empLeft: 0,
    decoy: null,
    message: '',
    messageLeft: 0,
    caughtReason: '',
    won: false,
    stats: { spotted: 0, gadgetsUsed: 0, get toolsUsed() { return this.gadgetsUsed; }, set toolsUsed(v) { this.gadgetsUsed = v; }, get timesSeen() { return this.spotted; }, set timesSeen(v) { this.spotted = v; } },
    wasSeen: false,
    rng: createRng(seed),
  };
}

// Rebuild the world from its own seed, switch it to the playing
// screen, and copy every property onto the existing object.
export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  fresh.screen = SCREEN_PLAYING;
  Object.assign(world, fresh);
}

// Show a short on-screen message for 3 seconds.
export function setMessage(world, text) {
  world.message = text;
  world.messageLeft = 3;
}

// Spend coins on a smoke bomb. Returns true when it goes off.
export function useSmoke(world) {
  if (world.screen !== SCREEN_PLAYING) return false;
  if (world.smokeLeft > 0) return false;
  if (world.coins < SMOKE_COST) {
    setMessage(world, `Need ${SMOKE_COST} coins for Smoke — grab some loot first.`);
    return false;
  }
  world.coins -= SMOKE_COST;
  world.smokeLeft = SMOKE_DURATION;
  world.stats.gadgetsUsed += 1;
  return true;
}

// Spend coins on an EMP pulse that kills every camera. Returns true
// when it goes off.
export function useEmp(world) {
  if (world.screen !== SCREEN_PLAYING) return false;
  if (world.empLeft > 0) return false;
  if (world.coins < EMP_COST) {
    setMessage(world, `Need ${EMP_COST} coins for EMP — grab some loot first.`);
    return false;
  }
  world.coins -= EMP_COST;
  world.empLeft = EMP_DURATION;
  for (const cam of world.level.cameras) cam.offLeft = EMP_DURATION;
  world.stats.gadgetsUsed += 1;
  return true;
}

// Throw a decoy coin at a target point. The nearest guard walks over
// to investigate it. Returns true when the coin is thrown.
export function throwDecoy(world, target) {
  if (world.screen !== SCREEN_PLAYING) return false;
  if (world.coins < DECOY_COST) {
    setMessage(world, `Need ${DECOY_COST} coins for a Decoy — grab some loot first.`);
    return false;
  }
  const dx = target.x - world.thief.x;
  const dy = target.y - world.thief.y;
  if (Math.hypot(dx, dy) > DECOY_THROW_RANGE) {
    setMessage(world, 'Target too far away.');
    return false;
  }
  world.coins -= DECOY_COST;
  world.decoy = { x: target.x, y: target.y, left: DECOY_DURATION };
  let nearest = null;
  let nearestDist = Infinity;
  for (const guard of world.level.guards) {
    const d = Math.hypot(guard.x - target.x, guard.y - target.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = guard;
    }
  }
  if (nearest) {
    nearest.investigate = { x: target.x, y: target.y };
    nearest.investigateLeft = DECOY_INVESTIGATE_DURATION;
  }
  world.stats.gadgetsUsed += 1;
  return true;
}

// Move one guard for a single step.
function stepGuard(world, guard, dt) {
  const alertSpeed = world.alarm >= ALARM_ALERT ? GUARD_ALERT_SPEED : GUARD_PATROL_SPEED;
  if (guard.investigate) {
    const target = guard.investigate;
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      if (guard.investigateLeft >= DECOY_INVESTIGATE_DURATION) {
        guard.baseAngle = guard.angle;
      }
      guard.investigateLeft -= dt;
      guard.angle = guard.baseAngle + Math.sin(world.time * GUARD_SWEEP_FREQUENCY) * GUARD_SWEEP_ARC;
      if (guard.investigateLeft <= 0) {
        guard.investigate = null;
        guard.investigateLeft = 0;
      }
      return;
    }
    const step = Math.min(alertSpeed * dt, dist);
    guard.x += (dx / dist) * step;
    guard.y += (dy / dist) * step;
    guard.angle = Math.atan2(dy, dx);
    return;
  }
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    guard.angle = guard.baseAngle + Math.sin(guard.sweepPhase) * GUARD_SWEEP_ARC;
    guard.sweepPhase += dt * GUARD_SWEEP_FREQUENCY;
    return;
  }
  const wp = guard.waypoints[guard.waypointIndex];
  const dx = wp.x - guard.x;
  const dy = wp.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseLeft = GUARD_WAYPOINT_PAUSE;
    guard.baseAngle = guard.angle;
    guard.sweepPhase = 0;
    return;
  }
  const step = Math.min(alertSpeed * dt, dist);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
}

// Move one camera for a single step.
function stepCamera(camera, dt) {
  if (camera.offLeft > 0) {
    camera.offLeft -= dt;
    return;
  }
  camera.phase += dt * CAMERA_SWEEP_SPEED;
  const t = (Math.sin(camera.phase) + 1) / 2;
  camera.angle = camera.sweepMin + t * (camera.sweepMax - camera.sweepMin);
}

// Run one simulation step. Returns true while the game is still
// running on the playing screen.
export function stepWorld(world, input, dt = STEP) {
  if (world.screen !== SCREEN_PLAYING) return false;
  const level = world.level;
  const thief = world.thief;

  world.time += dt;
  if (world.messageLeft > 0) world.messageLeft = Math.max(0, world.messageLeft - dt);
  if (world.smokeLeft > 0) world.smokeLeft = Math.max(0, world.smokeLeft - dt);
  if (world.empLeft > 0) world.empLeft = Math.max(0, world.empLeft - dt);
  if (world.decoy) {
    world.decoy.left -= dt;
    if (world.decoy.left <= 0) world.decoy = null;
  }
  for (const guard of level.guards) {
    if (guard.flash > 0) guard.flash = Math.max(0, guard.flash - dt);
  }
  for (const cam of level.cameras) {
    if (cam.flash > 0) cam.flash = Math.max(0, cam.flash - dt);
  }

  // Move the thief.
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  thief.sneaking = !!input.sneak;
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const speed = thief.sneaking ? THIEF_SNEAK_SPEED : THIEF_WALK_SPEED;
    thief.x += dx * speed * dt;
    thief.y += dy * speed * dt;
    thief.angle = Math.atan2(dy, dx);
  }
  const margin = 14 + THIEF_RADIUS;
  thief.x = Math.max(FLOOR.x + margin, Math.min(FLOOR.x + FLOOR.w - margin, thief.x));
  thief.y = Math.max(FLOOR.y + margin, Math.min(FLOOR.y + FLOOR.h - margin, thief.y));
  pushCircleOut(thief, THIEF_RADIUS, level.solids);

  for (const guard of level.guards) stepGuard(world, guard, dt);
  for (const cam of level.cameras) stepCamera(cam, dt);

  // Work out detection pressure.
  const hidden = world.smokeLeft > 0;
  let seenByGuard = false;
  let seenByCamera = false;
  let touched = false;
  if (!hidden) {
    for (const guard of level.guards) {
      const d = Math.hypot(thief.x - guard.x, thief.y - guard.y);
      if (d < GUARD_RADIUS + THIEF_RADIUS + 4) touched = true;
      if (inCone(guard, thief, GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE, level.solids)) {
        seenByGuard = true;
        guard.flash = 0.25;
      }
    }
    for (const cam of level.cameras) {
      if (cam.offLeft > 0) continue;
      if (inCone(cam, thief, CAMERA_RANGE, CAMERA_CONE_HALF_ANGLE, level.solids)) {
        seenByCamera = true;
        cam.flash = 0.25;
      }
    }
  }
  const seen = seenByGuard || seenByCamera || touched;
  if (seen && !world.wasSeen) world.stats.spotted += 1;
  world.wasSeen = seen;

  let pressure = 0;
  if (touched) pressure = ALARM_TOUCH_RATE;
  else if (seenByGuard) pressure = ALARM_GUARD_RATE;
  else if (seenByCamera) pressure = ALARM_CAMERA_RATE;
  if (pressure > 0 && thief.sneaking) pressure *= SNEAK_FACTOR;

  if (pressure > 0) {
    world.alarm = Math.min(ALARM_CAUGHT, world.alarm + pressure * dt);
  } else {
    world.alarm = Math.max(0, world.alarm - ALARM_DECAY_RATE * dt);
  }

  // Defeat.
  if (world.alarm >= ALARM_CAUGHT) {
    world.screen = SCREEN_CAUGHT;
    world.won = false;
    world.caughtReason =
      pressure >= ALARM_TOUCH_RATE
        ? 'Caught red-handed by a guard!'
        : 'Spotted — the alarm hit 100%.';
    return false;
  }

  // Collect gems.
  for (const gem of level.gems) {
    if (gem.taken) continue;
    if (Math.hypot(thief.x - gem.x, thief.y - gem.y) < THIEF_RADIUS + 16) {
      gem.taken = true;
      world.gemsTaken += 1;
      world.coins += GEM_COIN_VALUE;
      world.score += GEM_SCORE_VALUE;
      world.lootValue += 10;
      setMessage(world, `${gem.name} +${GEM_COIN_VALUE} coins!`);
    }
  }

  // Collect the Sunset Diamond.
  const diamond = level.diamond;
  if (!diamond.taken && Math.hypot(thief.x - diamond.x, thief.y - diamond.y) < THIEF_RADIUS + 22) {
    diamond.taken = true;
    world.diamondTaken = true;
    world.score += DIAMOND_SCORE_VALUE;
    world.lootValue += 500;
    setMessage(world, 'Sunset Diamond secured — get to the EXIT!');
  }

  // Win: reach the exit after taking the diamond.
  const exit = level.exit;
  if (world.diamondTaken && thief.x > exit.x - 10 && thief.y > exit.y - 30) {
    const timeBonus = Math.max(0, TIME_BONUS_LIMIT - world.time) * TIME_BONUS_PER_SECOND;
    const alarmBonus = Math.max(0, ALARM_CAUGHT - world.alarm) * ALARM_BONUS_PER_POINT;
    world.score += timeBonus + alarmBonus;
    world.screen = SCREEN_WON;
    world.won = true;
    return false;
  }

  return world.screen === SCREEN_PLAYING;
}

// The world's final score.
export function finalScore(world) {
  return world.score;
}

// True when the line between two points is not blocked by any solid
// in this world's level.
export function hasLineOfSight(world, x1, y1, x2, y2) {
  return segmentClear(x1, y1, x2, y2, world.level.solids);
}
