import { describe, it, expect } from 'vitest';
import {
  PHYS_CONFIG,
  CRANE_CONFIG,
  SETTLE_CONFIG,
  COLLAPSE_CONFIG,
  SCORE_CONFIG,
  CAMERA_CONFIG,
  DISPLAY_CONFIG,
  RACE_CONFIG,
  SABOTAGE_CONFIG,
  COOP_CONFIG,
  CARD_CONFIG,
  ITEM_CONFIG,
  BOT_CONFIG,
  SECURITY_CONFIG,
  NET_CONFIG,
} from './config/constants.js';

describe('Shared Config Constants (Mục 9 & Spec)', () => {
  it('should have correct PHYS constants', () => {
    expect(PHYS_CONFIG.gravity).toBe(-20);
    expect(PHYS_CONFIG.blockW).toBe(2.0);
    expect(PHYS_CONFIG.blockH).toBe(0.8);
    expect(PHYS_CONFIG.mass).toBe(1.0);
    expect(PHYS_CONFIG.friction).toBe(0.8);
    expect(PHYS_CONFIG.restitution).toBe(0.05);
    expect(PHYS_CONFIG.pxPerUnit).toBe(50);
    expect(PHYS_CONFIG.baseWidth).toBe(4.0);
  });

  it('should have correct CRANE constants', () => {
    expect(CRANE_CONFIG.amplitude).toBe(3.0);
    expect(CRANE_CONFIG.period).toBe(2.0);
    expect(CRANE_CONFIG.speedupEvery).toBe(10);
    expect(CRANE_CONFIG.speedupFactor).toBe(0.95);
    expect(CRANE_CONFIG.minPeriod).toBe(1.0);
    expect(CRANE_CONFIG.heightAboveTop).toBe(6.0);
    expect(CRANE_CONFIG.dropCooldown).toBe(0.6);
    expect(CRANE_CONFIG.releaseVelFactor).toBe(0.3);
  });

  it('should have correct SETTLE constants', () => {
    expect(SETTLE_CONFIG.maxTime).toBe(2.0);
    expect(SETTLE_CONFIG.velEps).toBe(0.05);
    expect(SETTLE_CONFIG.stableTime).toBe(0.3);
  });

  it('should have correct COLLAPSE constants', () => {
    expect(COLLAPSE_CONFIG.maxTiltDeg).toBe(25);
  });

  it('should have correct SCORE constants', () => {
    expect(SCORE_CONFIG.perFloor).toBe(10);
    expect(SCORE_CONFIG.perfectBonus).toBe(5);
    expect(SCORE_CONFIG.perfectTolerance).toBe(0.05);
    expect(SCORE_CONFIG.comboStart).toBe(3);
    expect(SCORE_CONFIG.comboMul).toBe(1.5);
  });

  it('should have correct CAMERA and DISPLAY constants', () => {
    expect(CAMERA_CONFIG.lerp).toBe(0.1);
    expect(DISPLAY_CONFIG.width).toBe(1280);
    expect(DISPLAY_CONFIG.height).toBe(720);
    expect(DISPLAY_CONFIG.minPlayers).toBe(1);
    expect(DISPLAY_CONFIG.maxPlayers).toBe(4);
  });

  it('should have correct RACE constants', () => {
    expect(RACE_CONFIG.targetScore).toBe(300);
    expect(RACE_CONFIG.matchTime).toBe(300);
    expect(RACE_CONFIG.defaultWave).toBe(3);
    expect(RACE_CONFIG.waveFloorBonus).toBe(2);
  });

  it('should have correct SABOTAGE constants', () => {
    expect(SABOTAGE_CONFIG.dropTimeLimit).toBe(10);
    expect(SABOTAGE_CONFIG.collapseRemoveFloors).toBe(3);
    expect(SABOTAGE_CONFIG.speedupFloor).toBe(60);
    expect(SABOTAGE_CONFIG.speedupPerRound).toBe(0.9);
  });

  it('should have correct COOP constants', () => {
    expect(COOP_CONFIG.targetFloors).toBe(25);
    expect(COOP_CONFIG.matchTime).toBe(360);
    expect(COOP_CONFIG.dropTimeLimit).toBe(10);
    expect(COOP_CONFIG.collapseRemoveFloors).toBe(3);
    expect(COOP_CONFIG.collapseLock).toBe(3);
  });

  it('should have correct CARD and ITEM constants', () => {
    expect(CARD_CONFIG.chooseTime).toBe(5);
    expect(CARD_CONFIG.revealTime).toBe(1.2);
    expect(ITEM_CONFIG.slots).toBe(2);
    expect(ITEM_CONFIG.gainEveryFloors).toBe(5);
    expect(ITEM_CONFIG.gainOnPerfectStreak).toBe(3);
    expect(ITEM_CONFIG.sabotageGainEveryTurns).toBe(2);
  });

  it('should have correct BOT, SECURITY, and NET constants', () => {
    expect(BOT_CONFIG.minReactionTimeMs).toBe(150);
    expect(BOT_CONFIG.maxReactionTimeMs).toBe(400);
    expect(BOT_CONFIG.difficulties.easy.threshold).toBe(0.6);
    expect(BOT_CONFIG.difficulties.easy.jitter).toBe(0.4);
    expect(BOT_CONFIG.difficulties.normal.threshold).toBe(0.35);
    expect(BOT_CONFIG.difficulties.normal.jitter).toBe(0.2);
    expect(BOT_CONFIG.difficulties.hard.threshold).toBe(0.15);
    expect(BOT_CONFIG.difficulties.hard.jitter).toBe(0.08);

    expect(SECURITY_CONFIG.maxDropPerSec).toBe(10);
    expect(SECURITY_CONFIG.minNicknameLength).toBe(2);
    expect(SECURITY_CONFIG.maxNicknameLength).toBe(16);

    expect(NET_CONFIG.defaultPort).toBe(2567);
    expect(NET_CONFIG.simHz).toBe(60);
    expect(NET_CONFIG.snapshotHz).toBe(20);
    expect(NET_CONFIG.interpDelayMs).toBe(100);
    expect(NET_CONFIG.maxLagCompMs).toBe(150);
    expect(NET_CONFIG.reconnectS).toBe(30);
    expect(NET_CONFIG.quickMatchWaitS).toBe(20);
    expect(NET_CONFIG.roomCodeLength).toBe(5);
  });
});
