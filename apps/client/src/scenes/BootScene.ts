import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 40, 'Tower Clash', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#38bdf8',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 30, 'Physics-based Multiplayer Tower Stacking Game', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '20px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 80, 'M0: Project Initialized', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        color: '#4ade80',
      })
      .setOrigin(0.5);
  }
}
