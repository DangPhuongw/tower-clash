import { describe, it, expect } from 'vitest';
import { DISPLAY_CONFIG } from '@tower-clash/shared';
import { baseClientConfig, GAME_WIDTH, GAME_HEIGHT, GAME_CONTAINER_ID } from './gameConfig.js';

describe('Client Configuration', () => {
  it('should configure game dimensions matching DISPLAY_CONFIG from shared', () => {
    expect(baseClientConfig.width).toBe(DISPLAY_CONFIG.width);
    expect(baseClientConfig.height).toBe(DISPLAY_CONFIG.height);
    expect(GAME_WIDTH).toBe(DISPLAY_CONFIG.width);
    expect(GAME_HEIGHT).toBe(DISPLAY_CONFIG.height);
  });

  it('should specify game-container as parent element', () => {
    expect(baseClientConfig.parent).toBe('game-container');
    expect(GAME_CONTAINER_ID).toBe('game-container');
  });

  it('should have dark background color', () => {
    expect(baseClientConfig.backgroundColor).toBe('#0f172a');
  });
});
