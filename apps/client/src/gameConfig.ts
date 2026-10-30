import { DISPLAY_CONFIG } from '@tower-clash/shared';

export const GAME_WIDTH = DISPLAY_CONFIG.width;
export const GAME_HEIGHT = DISPLAY_CONFIG.height;
export const GAME_CONTAINER_ID = 'game-container';

export const baseClientConfig = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: GAME_CONTAINER_ID,
  backgroundColor: '#0f172a',
} as const;
