// The Midnight Vault — tuning constants. One place for every number the
// heist game balances on: the room, the thief, the guards, the cameras and
// the tools the thief can buy with stolen coins.
//
// 22 Nov in-window tuning: alerted guards are faster (they used to gain on
// a sneaking thief at only 16 px/s, so the chase after the alarm passed 55
// felt toothless), and the amber HUD threshold is now a named constant
// instead of a magic 30 buried in render.js.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 800;
export const HUD_HEIGHT = 84;

// The playable floor, below the HUD bar.
export const FLOOR = { x: 0, y: HUD_HEIGHT, width: CANVAS_WIDTH, height: CANVAS_HEIGHT - HUD_HEIGHT };

export const THIEF_RADIUS = 13;
export const THIEF_WALK_SPEED = 175;
export const THIEF_SNEAK_SPEED = 92;

export const GUARD_RADIUS = 15;
export const GUARD_PATROL_SPEED = 72;
export const GUARD_ALERT_SPEED = 122;
export const GUARD_CONE_RANGE = 265;
export const GUARD_CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const GUARD_WAYPOINT_PAUSE = 1.4;
export const GUARD_SWEEP_ARC = 0.9;

export const CAMERA_RANGE = 235;
export const CAMERA_CONE_HALF_ANGLE = 0.5;
export const CAMERA_SWEEP_SPEED = 0.55;

export const ALARM_GUARD_RATE = 46; // per second while a guard sees the thief
export const ALARM_CAMERA_RATE = 26; // per second while a camera sees the thief
export const ALARM_TOUCH_RATE = 120; // per second while a guard is touching the thief
export const ALARM_DECAY_RATE = 7; // per second while nobody sees the thief
export const ALARM_SNEAK_FACTOR = 0.5;
export const ALARM_CAUGHT = 100;
export const ALARM_ALERTED = 55; // guards hurry and cones turn red above this
export const ALARM_WARNING = 30; // HUD alarm bar turns amber above this

export const TOOL_SMOKE_COST = 15;
export const TOOL_SMOKE_SECONDS = 4;
export const TOOL_SMOKE_RADIUS = 78;
export const TOOL_EMP_COST = 20;
export const TOOL_EMP_SECONDS = 6;
export const TOOL_DECOY_COST = 10;
export const TOOL_DECOY_RANGE = 320;
export const TOOL_DECOY_INVESTIGATE_SECONDS = 2.4;

export const GEM_VALUE_COINS = 10;
export const GEM_VALUE_SCORE = 50;
export const DIAMOND_VALUE_SCORE = 500;
export const START_COINS = 15;
export const TIME_BONUS_PER_SECOND = 2;
export const TIME_BONUS_CAP_SECONDS = 600;
export const ALARM_BONUS_PER_POINT = 2;

export const STEP = 1 / 60;

export const PALETTE = {
  floor: '#1c1a24',
  floorTile: '#23202e',
  floorTrim: '#2e2a3d',
  wall: '#4a4360',
  wallTop: '#6b6390',
  carpet: '#3a2333',
  carpetTrim: '#8a6d3b',
  caseGlass: '#7fb3d5',
  caseBase: '#5d4a2f',
  statue: '#8f8a7a',
  plant: '#2f6b3a',
  vaultFloor: '#241f33',
  vaultWall: '#7a6a35',
  exitGreen: '#2fbf5a',
  diamond: '#7fe7ff',
  gold: '#f2c14e',
  guard: '#2b4a7f',
  guardCone: 'rgba(255, 214, 90, 0.20)',
  guardConeAlert: 'rgba(255, 70, 60, 0.28)',
  cameraCone: 'rgba(255, 90, 90, 0.16)',
  cameraBody: '#3a3f4a',
  thief: '#14141c',
  thiefTrim: '#f2c14e',
  smoke: 'rgba(200, 200, 210, 0.35)',
  hud: '#100e16',
  hudText: '#f2ead8',
  alarmLow: '#3fbf5a',
  alarmMid: '#f2c14e',
  alarmHigh: '#ff4438',
};
