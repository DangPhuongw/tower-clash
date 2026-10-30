import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { baseClientConfig } from './gameConfig.js';

export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  ...baseClientConfig,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
};

export function initGame(): Phaser.Game | null {
  if (typeof window !== 'undefined' && document.getElementById(baseClientConfig.parent)) {
    return new Phaser.Game(config);
  }
  return null;
}

if (typeof window !== 'undefined' && document.getElementById(baseClientConfig.parent)) {
  initGame();
}
