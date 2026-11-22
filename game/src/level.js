// The Halcyon Gallery floor plan: one room the thief crosses, with three
// routes to the vault — the main hall (guard patrol), the west corridor
// (sweeping camera) and the east service corridor (narrow and slow, but
// almost unwatched). Walls and display cases block both movement and sight.
import { FLOOR } from './config.js';

function rect(x, y, width, height) {
  return { x, y, width, height };
}

// A circle (the thief or a guard) pushed out of every solid rectangle.
export function collideCircle(position, radius, solids) {
  for (const solid of solids) {
    const nearestX = Math.max(solid.x, Math.min(position.x, solid.x + solid.width));
    const nearestY = Math.max(solid.y, Math.min(position.y, solid.y + solid.height));
    const dx = position.x - nearestX;
    const dy = position.y - nearestY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= radius * radius) continue;
    if (distanceSquared === 0) {
      position.y = solid.y - radius;
      continue;
    }
    const distance = Math.sqrt(distanceSquared);
    position.x = nearestX + (dx / distance) * radius;
    position.y = nearestY + (dy / distance) * radius;
  }
}

function segmentHitsRect(ax, ay, bx, by, box) {
  const dx = bx - ax;
  const dy = by - ay;
  let tMin = 0;
  let tMax = 1;
  for (const [origin, delta, low, high] of [
    [ax, dx, box.x, box.x + box.width],
    [ay, dy, box.y, box.y + box.height],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (origin < low || origin > high) return false;
    } else {
      let t0 = (low - origin) / delta;
      let t1 = (high - origin) / delta;
      if (t0 > t1) [t0, t1] = [t1, t0];
      tMin = Math.max(tMin, t0);
      tMax = Math.min(tMax, t1);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

// True when nothing solid stands between the two points.
export function lineOfSightClear(ax, ay, bx, by, solids) {
  for (const solid of solids) {
    if (segmentHitsRect(ax, ay, bx, by, solid)) return false;
  }
  return true;
}

// True when `point` lies inside the watcher's vision cone and sight is clear.
export function insideVisionCone(watcher, point, range, halfAngle, solids) {
  const dx = point.x - watcher.x;
  const dy = point.y - watcher.y;
  const distance = Math.hypot(dx, dy);
  if (distance > range) return false;
  if (distance < 1) return true;
  const angleToPoint = Math.atan2(dy, dx);
  let delta = angleToPoint - watcher.angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  if (Math.abs(delta) > halfAngle) return false;
  return lineOfSightClear(watcher.x, watcher.y, point.x, point.y, solids);
}

export function buildLevel() {
  const top = FLOOR.y;
  const bottom = FLOOR.y + FLOOR.height;
  const left = FLOOR.x;
  const right = FLOOR.x + FLOOR.width;
  const W = 14; // wall thickness

  const walls = [
    rect(left, top, FLOOR.width, W), // north
    rect(left, bottom - W, FLOOR.width, W), // south
    rect(left, top, W, FLOOR.height), // west
    rect(right - W, top, W, FLOOR.height), // east
    // Vault walls (the diamond room, centre-right) with two door gaps:
    // north door x 900..966, east door y 348..412.
    rect(760, 200, 140, W), // vault north, west of door
    rect(966, 200, 168, W), // vault north, east of door
    rect(760, 200, W, 348), // vault west
    rect(760, 548, 374, W), // vault south
    rect(1120, 200, W, 148), // vault east, north of door
    rect(1120, 412, W, 136), // vault east, south of door
    // West corridor divider: leaves a top gap (the corridor's north mouth)
    // and a bottom gap (its south mouth) so the corridor is a real route.
    rect(238, 250, W, 300),
    // Service-corridor divider on the east, same idea.
    rect(1160, 250, W, 300),
    // A pillar wall in the main hall that splits the hall into two lanes.
    rect(430, 420, 200, W),
  ];

  // Display cases, statues and planters: cover the thief can hide behind.
  // They block movement and sight, so a route is a choice of which cover to use.
  const cover = [
    { kind: 'case', ...rect(330, 300, 130, 62) },
    { kind: 'case', ...rect(520, 470, 130, 62) },
    { kind: 'statue', ...rect(660, 250, 44, 44) },
    { kind: 'case', ...rect(330, 600, 130, 62) },
    { kind: 'plant', ...rect(120, 620, 46, 46) },
    { kind: 'plant', ...rect(120, 180, 46, 46) },
    { kind: 'case', ...rect(1200, 620, 46, 46) },
    { kind: 'statue', ...rect(940, 470, 44, 44) },
  ];

  const solids = [...walls, ...cover];

  // The Sunset Diamond on its pedestal inside the vault.
  const diamond = { x: 947, y: 382, taken: false };

  // Small loot: coins in display cases along every route, so each route pays.
  const gems = [
    { x: 150, y: 330, taken: false, label: 'Jade Frog' },
    { x: 150, y: 560, taken: false, label: 'Opal Eye' },
    { x: 395, y: 331, taken: false, label: 'Ruby Scarab' },
    { x: 585, y: 501, taken: false, label: 'Sapphire Owl' },
    { x: 1210, y: 330, taken: false, label: 'Pearl Moon' },
    { x: 1210, y: 560, taken: false, label: 'Topaz Sun' },
    { x: 860, y: 250, taken: false, label: 'Emerald Star' },
  ];

  const guards = [
    {
      name: 'Guard Mara',
      x: 300, y: 640, angle: -Math.PI / 2, radius: 15,
      waypoints: [
        { x: 300, y: 640 }, { x: 700, y: 640 }, { x: 700, y: 240 }, { x: 300, y: 240 },
      ],
      waypointIndex: 0, pause: 0, sweepPhase: 0, investigate: null, seenFlash: 0,
    },
    {
      name: 'Guard Odo',
      x: 820, y: 640, angle: Math.PI / 2, radius: 15,
      waypoints: [
        { x: 820, y: 640 }, { x: 1090, y: 640 }, { x: 1090, y: 160 }, { x: 820, y: 160 },
      ],
      waypointIndex: 0, pause: 0, sweepPhase: 0, investigate: null, seenFlash: 0,
    },
  ];

  const cameras = [
    {
      name: 'Cam West', x: 30, y: 330, baseAngle: 0, angle: 0,
      sweepFrom: -0.85, sweepTo: 0.85, phase: 0, disabled: 0, seenFlash: 0,
    },
    {
      name: 'Cam Hall', x: 560, y: 100, baseAngle: Math.PI / 2, angle: Math.PI / 2,
      sweepFrom: Math.PI / 2 - 0.8, sweepTo: Math.PI / 2 + 0.8, phase: 1.7, disabled: 0, seenFlash: 0,
    },
    {
      name: 'Cam Vault', x: 1120, y: 214, baseAngle: Math.PI, angle: Math.PI,
      sweepFrom: Math.PI - 0.7, sweepTo: Math.PI + 0.7, phase: 3.1, disabled: 0, seenFlash: 0,
    },
  ];

  // The getaway door, bottom-right, reached through the service corridor.
  const exit = { ...rect(1180, bottom - W, 86, W), label: 'EXIT' };

  const start = { x: 90, y: 700 };

  return { walls, cover, solids, diamond, gems, guards, cameras, exit, start };
}
