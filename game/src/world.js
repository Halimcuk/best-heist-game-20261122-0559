// The heist itself: the thief's movement, the guards' patrols, the cameras'
// sweeps, the alarm meter, the tools and the win / lose conditions.
import {
  ALARM_ALERTED, ALARM_BONUS_PER_POINT, ALARM_CAUGHT, ALARM_CAMERA_RATE,
  ALARM_DECAY_RATE, ALARM_GUARD_RATE, ALARM_SNEAK_FACTOR, ALARM_TOUCH_RATE,
  CAMERA_CONE_HALF_ANGLE, CAMERA_RANGE, CAMERA_SWEEP_SPEED, DIAMOND_VALUE_SCORE,
  FLOOR, GEM_VALUE_COINS, GEM_VALUE_SCORE, GUARD_ALERT_SPEED, GUARD_CONE_HALF_ANGLE,
  GUARD_CONE_RANGE, GUARD_PATROL_SPEED, GUARD_SWEEP_ARC, GUARD_WAYPOINT_PAUSE,
  START_COINS, STEP, THIEF_RADIUS, THIEF_SNEAK_SPEED, THIEF_WALK_SPEED,
  TIME_BONUS_CAP_SECONDS, TIME_BONUS_PER_SECOND, TOOL_DECOY_COST,
  TOOL_DECOY_INVESTIGATE_SECONDS, TOOL_DECOY_RANGE, TOOL_EMP_COST, TOOL_EMP_SECONDS,
  TOOL_SMOKE_COST, TOOL_SMOKE_RADIUS, TOOL_SMOKE_SECONDS,
} from './config.js';
import { buildLevel, collideCircle, insideVisionCone, lineOfSightClear } from './level.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WON = 'won';
export const SCREEN_CAUGHT = 'caught';

export function createWorld(seed = 1) {
  const level = buildLevel();
  return {
    seed,
    screen: SCREEN_TITLE,
    level,
    thief: { x: level.start.x, y: level.start.y, angle: 0, sneaking: false },
    alarm: 0,
    coins: START_COINS,
    score: 0,
    lootValue: 0,
    gemsTaken: 0,
    diamondTaken: false,
    time: 0,
    smoke: 0,
    emp: 0,
    decoy: null,
    message: '',
    messageTime: 0,
    caughtBy: '',
    won: false,
    stats: { timesSeen: 0, toolsUsed: 0 },
  };
}

export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  fresh.screen = SCREEN_PLAY;
  Object.assign(world, fresh);
}

function clampToFloor(position) {
  position.x = Math.max(FLOOR.x + 14 + THIEF_RADIUS, Math.min(FLOOR.x + FLOOR.width - 14 - THIEF_RADIUS, position.x));
  position.y = Math.max(FLOOR.y + 14 + THIEF_RADIUS, Math.min(FLOOR.y + FLOOR.height - 14 - THIEF_RADIUS, position.y));
}

function moveThief(world, input, dt) {
  const thief = world.thief;
  const speed = input.sneak ? THIEF_SNEAK_SPEED : THIEF_WALK_SPEED;
  thief.sneaking = input.sneak;
  let dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    thief.x += (dx / length) * speed * dt;
    thief.y += (dy / length) * speed * dt;
    thief.angle = Math.atan2(dy, dx);
  }
  clampToFloor(thief);
  collideCircle(thief, THIEF_RADIUS, world.level.solids);
}

function stepGuard(world, guard, dt) {
  const alerted = world.alarm >= ALARM_ALERTED;
  const speed = alerted ? GUARD_ALERT_SPEED : GUARD_PATROL_SPEED;
  if (guard.investigate) {
    const target = guard.investigate;
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 8) {
      guard.investigateTime -= dt;
      guard.angle += Math.sin(world.time * 2.2) * 0.02;
      if (guard.investigateTime <= 0) guard.investigate = null;
      return;
    }
    guard.angle = Math.atan2(dy, dx);
    guard.x += (dx / distance) * speed * dt;
    guard.y += (dy / distance) * speed * dt;
    collideCircle(guard, guard.radius, world.level.solids);
    return;
  }
  if (guard.pause > 0) {
    guard.pause -= dt;
    guard.sweepPhase += dt;
    guard.angle = guard.baseAngle + Math.sin(guard.sweepPhase * 1.6) * GUARD_SWEEP_ARC;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 10) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pause = GUARD_WAYPOINT_PAUSE;
    guard.baseAngle = guard.angle;
    guard.sweepPhase = 0;
    return;
  }
  guard.angle = Math.atan2(dy, dx);
  guard.x += (dx / distance) * speed * dt;
  guard.y += (dy / distance) * speed * dt;
  collideCircle(guard, guard.radius, world.level.solids);
}

function stepCamera(world, camera, dt) {
  if (camera.disabled > 0) {
    camera.disabled -= dt;
    return;
  }
  camera.phase += dt * CAMERA_SWEEP_SPEED;
  const sweep = (Math.sin(camera.phase) + 1) / 2;
  camera.angle = camera.sweepFrom + (camera.sweepTo - camera.sweepFrom) * sweep;
}

function thiefHiddenBySmoke(world) {
  return world.smoke > 0;
}

// How much the alarm rises this step; also flashes the watcher that saw the thief.
function detectionPressure(world, dt) {
  const thief = world.thief;
  const hidden = thiefHiddenBySmoke(world);
  let pressure = 0;
  if (!hidden) {
    for (const guard of world.level.guards) {
      const inCone = insideVisionCone(guard, thief, GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE, world.level.solids);
      const touching = Math.hypot(guard.x - thief.x, guard.y - thief.y) < guard.radius + THIEF_RADIUS + 4;
      if (inCone || touching) {
        pressure += touching ? ALARM_TOUCH_RATE : ALARM_GUARD_RATE;
        guard.seenFlash = 0.25;
      }
    }
    for (const camera of world.level.cameras) {
      if (camera.disabled > 0) continue;
      if (insideVisionCone(camera, thief, CAMERA_RANGE, CAMERA_CONE_HALF_ANGLE, world.level.solids)) {
        pressure += ALARM_CAMERA_RATE;
        camera.seenFlash = 0.25;
      }
    }
  }
  return pressure;
}

function collectLoot(world) {
  const thief = world.thief;
  for (const gem of world.level.gems) {
    if (!gem.taken && Math.hypot(gem.x - thief.x, gem.y - thief.y) < THIEF_RADIUS + 16) {
      gem.taken = true;
      world.gemsTaken += 1;
      world.coins += GEM_VALUE_COINS;
      world.score += GEM_VALUE_SCORE;
      world.lootValue += GEM_VALUE_COINS;
      setMessage(world, `${gem.label} pocketed! +${GEM_VALUE_COINS} coins`);
    }
  }
  const diamond = world.level.diamond;
  if (!diamond.taken && Math.hypot(diamond.x - thief.x, diamond.y - thief.y) < THIEF_RADIUS + 22) {
    diamond.taken = true;
    world.diamondTaken = true;
    world.score += DIAMOND_VALUE_SCORE;
    world.lootValue += 500;
    setMessage(world, 'THE SUNSET DIAMOND IS YOURS — reach the EXIT!');
  }
}

export function setMessage(world, text) {
  world.message = text;
  world.messageTime = 3;
}

export function useSmoke(world) {
  if (world.screen !== SCREEN_PLAY || world.smoke > 0) return false;
  if (world.coins < TOOL_SMOKE_COST) {
    setMessage(world, `Smoke bomb costs ${TOOL_SMOKE_COST} coins — grab more loot first`);
    return false;
  }
  world.coins -= TOOL_SMOKE_COST;
  world.smoke = TOOL_SMOKE_SECONDS;
  world.stats.toolsUsed += 1;
  setMessage(world, 'Smoke bomb! You are hidden while the cloud lasts');
  return true;
}

export function useEmp(world) {
  if (world.screen !== SCREEN_PLAY || world.emp > 0) return false;
  if (world.coins < TOOL_EMP_COST) {
    setMessage(world, `EMP pulse costs ${TOOL_EMP_COST} coins — grab more loot first`);
    return false;
  }
  world.coins -= TOOL_EMP_COST;
  world.emp = TOOL_EMP_SECONDS;
  for (const camera of world.level.cameras) camera.disabled = TOOL_EMP_SECONDS;
  world.stats.toolsUsed += 1;
  setMessage(world, 'EMP pulse! All cameras offline — move now');
  return true;
}

export function throwDecoy(world, target) {
  if (world.screen !== SCREEN_PLAY) return false;
  if (world.coins < TOOL_DECOY_COST) {
    setMessage(world, `A decoy coin costs ${TOOL_DECOY_COST} coins — grab more loot first`);
    return false;
  }
  const thief = world.thief;
  if (Math.hypot(target.x - thief.x, target.y - thief.y) > TOOL_DECOY_RANGE) {
    setMessage(world, 'Too far to throw — get closer first');
    return false;
  }
  world.coins -= TOOL_DECOY_COST;
  world.decoy = { x: target.x, y: target.y, time: TOOL_DECOY_INVESTIGATE_SECONDS + 1.5 };
  let nearest = null;
  let nearestDistance = Infinity;
  for (const guard of world.level.guards) {
    const distance = Math.hypot(guard.x - target.x, guard.y - target.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = guard;
    }
  }
  if (nearest) {
    nearest.investigate = { x: target.x, y: target.y };
    nearest.investigateTime = TOOL_DECOY_INVESTIGATE_SECONDS;
  }
  world.stats.toolsUsed += 1;
  setMessage(world, 'Decoy coin tossed — a guard goes to check the noise');
  return true;
}

function checkExit(world) {
  const thief = world.thief;
  const exit = world.level.exit;
  if (!world.diamondTaken) return;
  if (thief.x > exit.x - 10 && thief.y > exit.y - 30) {
    const timeBonus = Math.max(0, TIME_BONUS_CAP_SECONDS - Math.floor(world.time)) * TIME_BONUS_PER_SECOND;
    const alarmBonus = Math.max(0, Math.floor(ALARM_CAUGHT - world.alarm)) * ALARM_BONUS_PER_POINT;
    world.score += timeBonus + alarmBonus;
    world.screen = SCREEN_WON;
    world.won = true;
  }
}

// One fixed step of the heist. Returns true while the game is still being played.
export function stepWorld(world, input, dt = STEP) {
  if (world.screen !== SCREEN_PLAY) return false;
  world.time += dt;
  if (world.messageTime > 0) world.messageTime -= dt;
  if (world.smoke > 0) world.smoke -= dt;
  if (world.emp > 0) world.emp -= dt;
  if (world.decoy) {
    world.decoy.time -= dt;
    if (world.decoy.time <= 0) world.decoy = null;
  }
  for (const guard of world.level.guards) if (guard.seenFlash > 0) guard.seenFlash -= dt;
  for (const camera of world.level.cameras) if (camera.seenFlash > 0) camera.seenFlash -= dt;

  moveThief(world, input, dt);
  for (const guard of world.level.guards) stepGuard(world, guard, dt);
  for (const camera of world.level.cameras) stepCamera(world, camera, dt);

  const pressure = detectionPressure(world, dt);
  // Count a spotting event once, when the thief goes from unseen to seen.
  if (pressure > 0 && !world._wasSeen) world.stats.timesSeen += 1;
  world._wasSeen = pressure > 0;
  if (pressure > 0) {
    world.alarm += pressure * (world.thief.sneaking ? ALARM_SNEAK_FACTOR : 1) * dt;
  } else {
    world.alarm = Math.max(0, world.alarm - ALARM_DECAY_RATE * dt);
  }
  if (world.alarm >= ALARM_CAUGHT) {
    world.alarm = ALARM_CAUGHT;
    world.screen = SCREEN_CAUGHT;
    world.caughtBy = pressure >= ALARM_TOUCH_RATE ? 'caught red-handed by a guard' : 'spotted — the alarm hit 100%';
    return false;
  }

  collectLoot(world);
  checkExit(world);
  return world.screen === SCREEN_PLAY;
}

export function finalScore(world) {
  return world.score;
}

export function lineOfSight(world, ax, ay, bx, by) {
  return lineOfSightClear(ax, ay, bx, by, world.level.solids);
}
