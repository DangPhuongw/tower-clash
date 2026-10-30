export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GAME_CONTAINER_ID = 'game-container';

export const baseClientConfig = {
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: GAME_CONTAINER_ID,
  backgroundColor: '#0f172a',
} as const;
