// The Halcyon Gallery floor plan plus the geometry helpers the world
// simulation needs: circle-vs-rectangle pushing, segment blocking and
// vision-cone tests.

// Push a circle out of every solid rectangle it touches. The circle is
// moved along the line from the closest point on the rectangle; when
// the centre sits exactly inside a rectangle it is pushed up out of
// the rectangle by its own radius.
export function pushCircleOut(pos, radius, solids) {
  for (const s of solids) {
    const closestX = Math.max(s.x, Math.min(pos.x, s.x + s.w));
    const closestY = Math.max(s.y, Math.min(pos.y, s.y + s.h));
    const dx = pos.x - closestX;
    const dy = pos.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= radius * radius) continue;
    if (distSq === 0) {
      pos.y = s.y - radius;
      continue;
    }
    const dist = Math.sqrt(distSq);
    const push = radius - dist;
    pos.x += (dx / dist) * push;
    pos.y += (dy / dist) * push;
  }
  return pos;
}

// True when the segment from (ax, ay) to (bx, by) is not cut by any
// solid rectangle. Uses the slab (parameter-interval) test per rect:
// the segment is blocked when its parameter interval overlaps the
// rectangle's interval on both axes.
export function segmentClear(ax, ay, bx, by, solids) {
  const dx = bx - ax;
  const dy = by - ay;
  for (const s of solids) {
    let tMin = 0;
    let tMax = 1;
    let misses = false;
    const axes = [
      { d: dx, p: ax, lo: s.x, hi: s.x + s.w },
      { d: dy, p: ay, lo: s.y, hi: s.y + s.h },
    ];
    for (const { d, p, lo, hi } of axes) {
      if (d === 0) {
        if (p < lo || p > hi) misses = true;
        continue;
      }
      let t1 = (lo - p) / d;
      let t2 = (hi - p) / d;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) {
        misses = true;
        break;
      }
    }
    if (!misses && tMin <= tMax) return false;
  }
  return true;
}

// True when the target point lies inside the observer's vision cone
// and the line of sight is not blocked by any solid. A point closer
// than one pixel is always seen.
export function inCone(observer, target, range, halfAngle, solids) {
  const dx = target.x - observer.x;
  const dy = target.y - observer.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  if (dist > range) return false;
  let diff = Math.atan2(dy, dx) - observer.angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > halfAngle) return false;
  return segmentClear(observer.x, observer.y, target.x, target.y, solids);
}

// Build the gallery floor plan: walls, cover, the vault, loot, guards,
// cameras, the exit and the thief's starting point. Takes no arguments.
export function buildLevel() {
  const walls = [
    // Outer walls around the floor (thickness 14).
    { x: 0, y: 84, w: 1280, h: 14 },
    { x: 0, y: 786, w: 1280, h: 14 },
    { x: 0, y: 84, w: 14, h: 716 },
    { x: 1266, y: 84, w: 14, h: 716 },
    // Vault north wall: two segments, door gap at x 900..966.
    { x: 760, y: 200, w: 140, h: 14 },
    { x: 966, y: 200, w: 168, h: 14 },
    // Vault west wall.
    { x: 760, y: 200, w: 14, h: 348 },
    // Vault south wall.
    { x: 760, y: 548, w: 374, h: 14 },
    // Vault east wall: two segments, door gap at y 348..412.
    { x: 1120, y: 200, w: 14, h: 148 },
    { x: 1120, y: 412, w: 14, h: 136 },
    // West corridor divider (gaps above and below make it a real route).
    { x: 238, y: 250, w: 14, h: 300 },
    // East service corridor divider.
    { x: 1160, y: 250, w: 14, h: 300 },
    // Main hall pillar (centred on 430, 420), splitting the hall.
    { x: 330, y: 413, w: 200, h: 14 },
  ];

  // Covers are placed by their centre point; stored here as top-left
  // rectangles. (Centres put the two case gems exactly on the cases'
  // bottom-right corners, so every gem stays collectable, and they
  // leave the walk lanes and the east corridor passable.)
  const cover = [
    { type: 'case', x: 265, y: 269, w: 130, h: 62 },
    { type: 'case', x: 455, y: 439, w: 130, h: 62 },
    { type: 'case', x: 265, y: 569, w: 130, h: 62 },
    { type: 'case', x: 1177, y: 597, w: 46, h: 46 },
    { type: 'statue', x: 638, y: 228, w: 44, h: 44 },
    { type: 'statue', x: 918, y: 448, w: 44, h: 44 },
    { type: 'plant', x: 97, y: 597, w: 46, h: 46 },
    { type: 'plant', x: 97, y: 157, w: 46, h: 46 },
  ];

  const solids = [...walls, ...cover];

  const diamond = { x: 947, y: 382, taken: false };

  const gems = [
    { x: 150, y: 330, taken: false, name: 'Jade Frog' },
    { x: 150, y: 560, taken: false, name: 'Opal Eye' },
    { x: 395, y: 331, taken: false, name: 'Ruby Scarab' },
    { x: 585, y: 501, taken: false, name: 'Sapphire Owl' },
    { x: 1210, y: 330, taken: false, name: 'Pearl Moon' },
    { x: 1210, y: 560, taken: false, name: 'Topaz Sun' },
    { x: 860, y: 250, taken: false, name: 'Emerald Star' },
  ];

  const guards = [
    {
      name: 'Mara',
      x: 300,
      y: 640,
      angle: -Math.PI / 2,
      radius: 15,
      waypoints: [
        { x: 300, y: 640 },
        { x: 700, y: 640 },
        { x: 700, y: 240 },
        { x: 300, y: 240 },
      ],
      waypointIndex: 0,
      pauseLeft: 0,
      sweepPhase: 0,
      baseAngle: -Math.PI / 2,
      investigate: null,
      investigateLeft: 0,
      flash: 0,
    },
    {
      name: 'Odo',
      x: 820,
      y: 640,
      angle: Math.PI / 2,
      radius: 15,
      waypoints: [
        { x: 820, y: 640 },
        { x: 1090, y: 640 },
        { x: 1090, y: 160 },
        { x: 820, y: 160 },
      ],
      waypointIndex: 0,
      pauseLeft: 0,
      sweepPhase: 0,
      baseAngle: Math.PI / 2,
      investigate: null,
      investigateLeft: 0,
      flash: 0,
    },
  ];

  const cameras = [
    {
      name: 'West',
      x: 30,
      y: 330,
      baseAngle: 0,
      angle: 0,
      sweepMin: -0.85,
      sweepMax: 0.85,
      phase: 0,
      offLeft: 0,
      flash: 0,
    },
    {
      name: 'Hall',
      x: 560,
      y: 100,
      baseAngle: Math.PI / 2,
      angle: Math.PI / 2,
      sweepMin: Math.PI / 2 - 0.8,
      sweepMax: Math.PI / 2 + 0.8,
      phase: 1.7,
      offLeft: 0,
      flash: 0,
    },
    {
      name: 'Vault',
      x: 1120,
      y: 214,
      baseAngle: Math.PI,
      angle: Math.PI,
      sweepMin: Math.PI - 0.7,
      sweepMax: Math.PI + 0.7,
      phase: 3.1,
      offLeft: 0,
      flash: 0,
    },
  ];

  const exit = { x: 1180, y: 786, w: 86, h: 14, label: 'EXIT' };
  const start = { x: 90, y: 700 };

  return { walls, cover, solids, diamond, gems, guards, cameras, exit, start };
}
