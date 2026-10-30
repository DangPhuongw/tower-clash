import { describe, it, expect } from 'vitest';
import { baseClientConfig, GAME_WIDTH, GAME_HEIGHT, GAME_CONTAINER_ID } from './gameConfig.js';

describe('Client Configuration', () => {
  it('should configure game dimensions to 1280x720 as specified in PLAN.md', () => {
    expect(baseClientConfig.width).toBe(1280);
    expect(baseClientConfig.height).toBe(720);
    expect(GAME_WIDTH).toBe(1280);
    expect(GAME_HEIGHT).toBe(720);
  });

  it('should specify game-container as parent element', () => {
    expect(baseClientConfig.parent).toBe('game-container');
    expect(GAME_CONTAINER_ID).toBe('game-container');
  });

  it('should have dark background color', () => {
    expect(baseClientConfig.backgroundColor).toBe('#0f172a');
  });
});
