// Every pixel of the heist, drawn procedurally on one canvas: the night
// gallery, the guards' sweeping vision cones, the cameras, the loot and the
// alarm meter — so safe cover, danger and loot are obvious at a glance.
//
// 22 Nov in-window tuning: canvas sizes and the amber alarm threshold now
// come from config.js (CANVAS_WIDTH / CANVAS_HEIGHT / ALARM_WARNING)
// instead of the hardcoded 1280, 800 and 30 that used to be scattered
// through this file.
import {
  ALARM_ALERTED, ALARM_CAUGHT, ALARM_WARNING, CAMERA_CONE_HALF_ANGLE,
  CAMERA_RANGE, CANVAS_HEIGHT, CANVAS_WIDTH, FLOOR, GUARD_CONE_HALF_ANGLE,
  GUARD_CONE_RANGE, HUD_HEIGHT, PALETTE, THIEF_RADIUS, TOOL_DECOY_COST,
  TOOL_EMP_COST, TOOL_SMOKE_COST, TOOL_SMOKE_RADIUS,
} from './config.js';
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './world.js';

function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawRect(ctx, box, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(box.x, box.y, box.width, box.height);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x + 1, box.y + 1, box.width - 2, box.height - 2);
  }
}

function drawFloor(ctx, world) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.width, FLOOR.height);
  // Marble tiles.
  ctx.fillStyle = PALETTE.floorTile;
  const tile = 80;
  for (let y = FLOOR.y; y < FLOOR.y + FLOOR.height; y += tile) {
    for (let x = FLOOR.x + ((y / tile) % 2) * tile / 2; x < FLOOR.x + FLOOR.width; x += tile) {
      ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
    }
  }
  // The red carpet of the main hall: the thief's lane through the room.
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(252, FLOOR.y + 14, 488, FLOOR.height - 28);
  ctx.strokeStyle = PALETTE.carpetTrim;
  ctx.lineWidth = 3;
  ctx.strokeRect(256, FLOOR.y + 18, 480, FLOOR.height - 36);
  // Vault floor: darker stone with a gold border.
  ctx.fillStyle = PALETTE.vaultFloor;
  ctx.fillRect(774, 214, 346, 334);
  ctx.strokeStyle = PALETTE.vaultWall;
  ctx.lineWidth = 4;
  ctx.strokeRect(774, 214, 346, 334);
}

function drawWallsAndCover(ctx, world) {
  for (const wall of world.level.walls) {
    drawRect(ctx, wall, PALETTE.wall, PALETTE.wallTop);
  }
  for (const item of world.level.cover) {
    if (item.kind === 'case') {
      drawRect(ctx, item, PALETTE.caseBase, '#8a6d3b');
      ctx.fillStyle = 'rgba(127, 179, 213, 0.35)';
      ctx.fillRect(item.x + 6, item.y + 6, item.width - 12, item.height - 12);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(item.x + 10, item.y + item.height - 10);
      ctx.lineTo(item.x + item.width / 2, item.y + 10);
      ctx.stroke();
    } else if (item.kind === 'statue') {
      ctx.fillStyle = PALETTE.statue;
      ctx.beginPath();
      ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6f6a5c';
      ctx.beginPath();
      ctx.arc(item.x + item.width / 2, item.y + item.height / 2, 8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = PALETTE.plant;
      ctx.beginPath();
      ctx.arc(item.x + 23, item.y + 23, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f8b4a';
      ctx.beginPath();
      ctx.arc(item.x + 16, item.y + 16, 10, 0, Math.PI * 2);
      ctx.arc(item.x + 30, item.y + 28, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPaintings(ctx) {
  const paintings = [
    { x: 60, y: 100, w: 90, h: 54, c: '#7a3b3b' },
    { x: 300, y: 100, w: 90, h: 54, c: '#3b5a7a' },
    { x: 560, y: 100, w: 90, h: 54, c: '#5a7a3b' },
  ];
  for (const painting of paintings) {
    ctx.fillStyle = '#8a6d3b';
    ctx.fillRect(painting.x - 4, painting.y - 4, painting.w + 8, painting.h + 8);
    ctx.fillStyle = painting.c;
    ctx.fillRect(painting.x, painting.y, painting.w, painting.h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(painting.x + painting.w / 2, painting.y + painting.h / 2, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLoot(ctx, world, time) {
  for (const gem of world.level.gems) {
    if (gem.taken) continue;
    const bob = Math.sin(time * 3 + gem.x) * 2;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.moveTo(gem.x, gem.y - 10 + bob);
    ctx.lineTo(gem.x + 8, gem.y + bob);
    ctx.lineTo(gem.x, gem.y + 10 + bob);
    ctx.lineTo(gem.x - 8, gem.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(gem.x - 2, gem.y - 3 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const diamond = world.level.diamond;
  if (!diamond.taken) {
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    const glow = ctx.createRadialGradient(diamond.x, diamond.y, 4, diamond.x, diamond.y, 46 * pulse);
    glow.addColorStop(0, 'rgba(127, 231, 255, 0.55)');
    glow.addColorStop(1, 'rgba(127, 231, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(diamond.x, diamond.y, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.diamond;
    ctx.beginPath();
    ctx.moveTo(diamond.x, diamond.y - 18);
    ctx.lineTo(diamond.x + 14, diamond.y - 4);
    ctx.lineTo(diamond.x + 10, diamond.y + 14);
    ctx.lineTo(diamond.x - 10, diamond.y + 14);
    ctx.lineTo(diamond.x - 14, diamond.y - 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(diamond.x, diamond.y - 18);
    ctx.lineTo(diamond.x + 14, diamond.y - 4);
    ctx.lineTo(diamond.x - 14, diamond.y - 4);
    ctx.closePath();
    ctx.fill();
    // Sparkles.
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 3; i += 1) {
      const angle = time * 2 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(diamond.x + Math.cos(angle) * 26, diamond.y + Math.sin(angle) * 26, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    drawLabel(ctx, '★ SUNSET DIAMOND ★', diamond.x, diamond.y - 34, '#7fe7ff', 13);
  }
}

function drawLabel(ctx, text, x, y, color, size = 12) {
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawGuard(ctx, world, guard) {
  const alerted = world.alarm >= ALARM_ALERTED;
  const coneFill = guard.seenFlash > 0 || alerted ? PALETTE.guardConeAlert : PALETTE.guardCone;
  drawCone(ctx, guard.x, guard.y, guard.angle, GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE, coneFill);
  // Guard body: navy uniform, brass badge, torch.
  ctx.fillStyle = '#1c2f55';
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.guard;
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.angle) * 6, guard.y + Math.sin(guard.angle) * 6, 3, 0, Math.PI * 2);
  ctx.fill();
  // Eyes looking along the cone.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.angle - 0.3) * 7, guard.y + Math.sin(guard.angle - 0.3) * 7, 2, 0, Math.PI * 2);
  ctx.arc(guard.x + Math.cos(guard.angle + 0.3) * 7, guard.y + Math.sin(guard.angle + 0.3) * 7, 2, 0, Math.PI * 2);
  ctx.fill();
  if (guard.investigate) {
    drawLabel(ctx, '?', guard.x, guard.y + guard.radius + 14, '#ffe08a', 16);
  }
}

// Watcher name tags, drawn after the walls so a wall never covers a name.
function drawWatcherLabels(ctx, world) {
  for (const guard of world.level.guards) {
    const x = Math.max(55, Math.min(1225, guard.x));
    drawLabel(ctx, guard.name, x, guard.y - guard.radius - 12, guard.seenFlash > 0 ? '#ff6a5e' : '#cdd7ff', 11);
  }
  for (const camera of world.level.cameras) {
    const x = Math.max(55, Math.min(1225, camera.x));
    drawLabel(ctx, camera.disabled > 0 ? 'CAM OFFLINE' : camera.name, x, camera.y - 20, camera.disabled > 0 ? '#999999' : '#ff9a8a', 10);
  }
}

function drawCamera(ctx, world, camera) {
  if (camera.disabled <= 0) {
    drawCone(ctx, camera.x, camera.y, camera.angle, CAMERA_RANGE, CAMERA_CONE_HALF_ANGLE, PALETTE.cameraCone);
  }
  ctx.fillStyle = PALETTE.cameraBody;
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = camera.disabled > 0 ? '#888888' : (camera.seenFlash > 0 ? '#ff4438' : '#ff5a4a');
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(camera.x, camera.y);
  ctx.lineTo(camera.x + Math.cos(camera.angle) * 18, camera.y + Math.sin(camera.angle) * 18);
  ctx.stroke();
  ctx.fillStyle = camera.disabled > 0 ? '#888888' : '#ff5a4a';
  ctx.beginPath();
  ctx.arc(camera.x + Math.cos(camera.angle) * 18, camera.y + Math.sin(camera.angle) * 18, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawThief(ctx, world, time) {
  const thief = world.thief;
  if (world.smoke > 0) {
    ctx.fillStyle = PALETTE.smoke;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, TOOL_SMOKE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(thief.x, thief.y + THIEF_RADIUS - 2, THIEF_RADIUS, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // The thief: black hood, gold trim, mask.
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, THIEF_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, THIEF_RADIUS - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.thiefTrim;
  ctx.beginPath();
  ctx.arc(thief.x + Math.cos(thief.angle) * 5, thief.y + Math.sin(thief.angle) * 5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(thief.x + Math.cos(thief.angle - 0.45) * 6, thief.y + Math.sin(thief.angle - 0.45) * 6, 1.8, 0, Math.PI * 2);
  ctx.arc(thief.x + Math.cos(thief.angle + 0.45) * 6, thief.y + Math.sin(thief.angle + 0.45) * 6, 1.8, 0, Math.PI * 2);
  ctx.fill();
  if (world.diamondTaken) {
    ctx.fillStyle = PALETTE.diamond;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y - THIEF_RADIUS - 6, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  drawLabel(ctx, thief.sneaking ? 'SNEAKING' : 'YOU', thief.x, thief.y - THIEF_RADIUS - 12, '#ffe08a', 11);
  if (world.decoy) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(world.decoy.x, world.decoy.y, 6, 0, Math.PI * 2);
    ctx.fill();
    drawLabel(ctx, 'CLINK!', world.decoy.x, world.decoy.y - 16, '#ffe08a', 11);
  }
}

function drawExit(ctx, world, time) {
  const exit = world.level.exit;
  const glow = 0.7 + Math.sin(time * 3) * 0.3;
  ctx.fillStyle = `rgba(47, 191, 90, ${0.25 + glow * 0.3})`;
  ctx.fillRect(exit.x - 6, exit.y - 34, exit.width + 12, 40);
  ctx.fillStyle = PALETTE.exitGreen;
  ctx.fillRect(exit.x, exit.y - 6, exit.width, 6);
  const labelX = 1145;
  drawLabel(ctx, 'EXIT → GETAWAY', labelX, exit.y - 22, '#7dff9e', 14);
  if (!world.diamondTaken) {
    drawLabel(ctx, 'locked until the diamond is yours', labelX, exit.y - 48, '#b9f5c8', 11);
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(0, HUD_HEIGHT - 4, CANVAS_WIDTH, 4);

  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText('🌙 THE MIDNIGHT VAULT', 18, 24);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#b9b0d0';
  const objective = world.diamondTaken
    ? 'Diamond secured — reach the green EXIT, bottom-right!'
    : 'Steal the SUNSET DIAMOND from the vault, then reach the EXIT.';
  ctx.fillText(objective, 18, 52);

  // Alarm meter: the big bar every judge looks for.
  const alarmX = 470;
  const alarmW = 300;
  const alarmFraction = world.alarm / ALARM_CAUGHT;
  const alarmColor = world.alarm >= ALARM_ALERTED ? PALETTE.alarmHigh : world.alarm >= ALARM_WARNING ? PALETTE.alarmMid : PALETTE.alarmLow;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText('🚨 ALARM', alarmX, 22);
  ctx.fillStyle = '#241f33';
  ctx.fillRect(alarmX, 34, alarmW, 20);
  ctx.fillStyle = alarmColor;
  ctx.fillRect(alarmX, 34, alarmW * alarmFraction, 20);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(alarmX + 0.5, 34.5, alarmW, 20);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(world.alarm)}%`, alarmX + alarmW / 2, 45);
  ctx.textAlign = 'left';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#b9b0d0';
  ctx.fillText(world.alarm >= ALARM_ALERTED ? 'SPOTTED — guards are hunting!' : 'stay out of the cones', alarmX, 66);

  // Loot and tools.
  const toolsX = 800;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`💰 ${world.coins} coins   ◆ $${world.lootValue} loot`, toolsX, 22);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#d8cfae';
  ctx.fillText(`[1] Smoke ${TOOL_SMOKE_COST}c   [2] EMP ${TOOL_EMP_COST}c   [3]/click Decoy ${TOOL_DECOY_COST}c`, toolsX, 46);
  ctx.fillStyle = '#b9b0d0';
  const toolsLine = [
    world.smoke > 0 ? `smoke ${world.smoke.toFixed(1)}s` : null,
    world.emp > 0 ? `cameras off ${world.emp.toFixed(1)}s` : null,
  ].filter(Boolean).join('  •  ');
  ctx.fillText(toolsLine || 'Shift = sneak (half alarm)   •   R = restart', toolsX, 66);

  // Timer and score, right side.
  ctx.textAlign = 'right';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudText;
  const minutes = Math.floor(world.time / 60);
  const seconds = Math.floor(world.time % 60).toString().padStart(2, '0');
  ctx.fillText(`⏱ ${minutes}:${seconds}`, 1262, 22);
  ctx.fillText(`SCORE ${world.score}`, 1262, 46);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#b9b0d0';
  ctx.fillText(`gems ${world.gemsTaken}/7`, 1262, 66);
  ctx.textAlign = 'left';
}

function drawMessage(ctx, world) {
  if (world.messageTime <= 0 || !world.message) return;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const width = ctx.measureText(world.message).width + 36;
  ctx.fillStyle = 'rgba(16, 14, 22, 0.85)';
  ctx.fillRect(CANVAS_WIDTH / 2 - width / 2, HUD_HEIGHT + 14, width, 34);
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1;
  ctx.strokeRect(CANVAS_WIDTH / 2 - width / 2 + 0.5, HUD_HEIGHT + 14.5, width, 34);
  ctx.fillStyle = '#ffe08a';
  ctx.fillText(world.message, CANVAS_WIDTH / 2, HUD_HEIGHT + 32);
  ctx.textAlign = 'left';
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10, 8, 16, 0.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillStyle = accent;
  ctx.fillText(title, CANVAS_WIDTH / 2, 300);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = '#f2ead8';
  lines.forEach((line, index) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, 380 + index * 34);
  });
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = '#b9b0d0';
  ctx.fillText('Press ENTER to play again  •  R to restart', CANVAS_WIDTH / 2, 380 + lines.length * 34 + 24);
  ctx.textAlign = 'left';
}

function drawTitle(ctx, world) {
  ctx.fillStyle = '#14121d';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // A glimpse of the gallery behind the title.
  drawFloor(ctx, world);
  drawWallsAndCover(ctx, world);
  drawLoot(ctx, world, 1.2);
  ctx.fillStyle = 'rgba(10, 8, 16, 0.78)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('🌙 THE MIDNIGHT VAULT', CANVAS_WIDTH / 2, 220);
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillStyle = '#f2ead8';
  ctx.fillText('One thief. Two guards. Three cameras. One diamond.', CANVAS_WIDTH / 2, 300);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = '#d8cfae';
  const lines = [
    'WASD / arrows — move     Shift — sneak (half the alarm)',
    '[1] Smoke bomb (15c)  •  [2] EMP pulse (20c)  •  [3] or click — decoy coin (10c)',
    'Three routes to the vault: the main hall, the west corridor, the east service corridor.',
    'Grab the SUNSET DIAMOND, then slip out the green EXIT. If the alarm hits 100%, you are caught.',
  ];
  lines.forEach((line, index) => {
    ctx.fillText(line, CANVAS_WIDTH / 2, 370 + index * 32);
  });
  const blink = Math.sin(Date.now() / 400) > 0 ? 1 : 0.35;
  ctx.globalAlpha = blink;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillStyle = '#7dff9e';
  ctx.fillText('— PRESS ENTER TO START THE HEIST —', CANVAS_WIDTH / 2, 560);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

export function drawGame(ctx, world, time) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (world.screen === SCREEN_TITLE) {
    drawTitle(ctx, world);
    return;
  }
  drawFloor(ctx, world);
  drawPaintings(ctx);
  drawLoot(ctx, world, time);
  drawExit(ctx, world, time);
  for (const camera of world.level.cameras) drawCamera(ctx, world, camera);
  for (const guard of world.level.guards) drawGuard(ctx, world, guard);
  drawWallsAndCover(ctx, world);
  drawWatcherLabels(ctx, world);
  drawThief(ctx, world, time);
  drawHud(ctx, world);
  drawMessage(ctx, world);
  if (world.screen === SCREEN_WON) {
    drawOverlay(ctx, '🎉 GETAWAY!', [
      `You slipped out with the Sunset Diamond.`,
      `Score ${world.score}  •  loot $${world.lootValue}  •  gems ${world.gemsTaken}/7  •  time ${Math.floor(world.time)}s`,
      `Tools used: ${world.stats.toolsUsed}  •  times spotted: ${world.stats.timesSeen}`,
    ], '#7dff9e');
  } else if (world.screen === SCREEN_CAUGHT) {
    drawOverlay(ctx, '🚨 CAUGHT!', [
      world.caughtBy,
      `Score ${world.score}  •  loot $${world.lootValue}  •  alarm hit 100%`,
      'Read the cones before you move — smoke, EMP and decoys buy you seconds.',
    ], '#ff6a5e');
  }
}
