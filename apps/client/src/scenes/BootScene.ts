import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const { width, height } = this.scale;

    // Nền gradient tối hiện đại
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x1e1b4b, 0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

    // Tiêu đề lớn
    this.add
      .text(width / 2, height / 2 - 100, 'TOWER CLASH', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: '#38bdf8',
        stroke: '#0369a1',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Phụ đề
    this.add
      .text(width / 2, height / 2 - 30, 'Physics-based Multiplayer Tower Stacking Game', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '20px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    // Nút Bắt đầu Luyện tập
    const startBtn = this.add
      .text(width / 2, height / 2 + 55, 'BẮT ĐẦU LUYỆN TẬP (OFFLINE)', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#0f172a',
        backgroundColor: '#38bdf8',
        padding: { x: 36, y: 16 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => {
      startBtn.setStyle({ backgroundColor: '#7dd3fc', color: '#020617' });
      startBtn.setScale(1.04);
    });

    startBtn.on('pointerout', () => {
      startBtn.setStyle({ backgroundColor: '#38bdf8', color: '#0f172a' });
      startBtn.setScale(1.0);
    });

    const startGame = () => {
      this.scene.start('GameScene');
    };

    startBtn.on('pointerdown', startGame);

    // Hướng dẫn phím
    this.add
      .text(width / 2, height / 2 + 130, 'Nhấn SPACE hoặc Click nút trên để chơi', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        color: '#64748b',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-SPACE', startGame);
  }
}
