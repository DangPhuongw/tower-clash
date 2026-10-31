import Phaser from 'phaser';
import {
  CAMERA_CONFIG,
  CRANE_CONFIG,
  DISPLAY_CONFIG,
  PHYS_CONFIG,
  SCORE_CONFIG,
  TowerController,
  type DropEvent,
} from '@tower-clash/shared';

export class GameScene extends Phaser.Scene {
  private controller: TowerController | null = null;
  private isReady = false;

  // Camera & Render offsets
  private cameraY = 0;
  private readonly screenCenterX = DISPLAY_CONFIG.width / 2;
  private readonly groundScreenY = DISPLAY_CONFIG.height - 100; // 620 px

  // Phaser Graphics
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private worldGraphics!: Phaser.GameObjects.Graphics;

  // HUD Text Elements
  private scoreText!: Phaser.GameObjects.Text;
  private floorText!: Phaser.GameObjects.Text;
  private comboBadgeContainer!: Phaser.GameObjects.Container;
  private comboText!: Phaser.GameObjects.Text;
  private comboSubText!: Phaser.GameObjects.Text;
  private dropStatusText!: Phaser.GameObjects.Text;
  private dropProgressBar!: Phaser.GameObjects.Graphics;

  // Floating Toast Notifications
  private toastContainer!: Phaser.GameObjects.Container;
  private toastText!: Phaser.GameObjects.Text;
  private toastSubText!: Phaser.GameObjects.Text;
  private toastTween: Phaser.Tweens.Tween | null = null;

  // Collapse / Game Over Modal
  private gameOverContainer!: Phaser.GameObjects.Container;
  private modalScoreText!: Phaser.GameObjects.Text;
  private modalFloorText!: Phaser.GameObjects.Text;
  private modalComboText!: Phaser.GameObjects.Text;
  private modalPerfectText!: Phaser.GameObjects.Text;

  // Stars / Particles
  private stars: Array<{ x: number; y: number; size: number; alpha: number; speed: number }> = [];

  constructor() {
    super('GameScene');
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;

    // 1. Tạo các lớp đồ hoạ
    this.bgGraphics = this.add.graphics();
    this.worldGraphics = this.add.graphics();

    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy', () => this.cleanup());

    // 2. Tạo sao / hạt nền (parallax stars)
    this.initStars(width, height);

    // 3. Khởi tạo HUD UI
    this.createHud(width);

    // 4. Khởi tạo Modal Game Over
    this.createGameOverModal(width, height);

    // 5. Đăng ký sự kiện điều khiển (Chuột, Space, R)
    this.setupInput();

    // 6. Khởi tạo mô phỏng vật lý và controller
    try {
      this.controller = await TowerController.create({ baseX: 0 });
      this.isReady = true;
    } catch (err) {
      console.error('Không thể khởi tạo TowerController:', err);
    }
  }

  private initStars(width: number, height: number): void {
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(0, height * 3),
        size: Phaser.Math.FloatBetween(1, 2.5),
        alpha: Phaser.Math.FloatBetween(0.2, 0.8),
        speed: Phaser.Math.FloatBetween(0.05, 0.2),
      });
    }
  }

  private createHud(width: number): void {
    // Thanh trên cùng: Title & Mode
    this.add
      .text(32, 24, 'TOWER CLASH', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#38bdf8',
      })
      .setDepth(10);

    const modeBadge = this.add
      .text(190, 26, 'LUYỆN TẬP (OFFLINE)', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#4ade80',
        backgroundColor: '#064e3b',
        padding: { x: 8, y: 4 },
      })
      .setDepth(10);
    modeBadge.setData('round', 4);

    // Điểm số trung tâm
    this.scoreText = this.add
      .text(width / 2, 24, '0', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '44px',
        fontStyle: 'bold',
        color: '#f8fafc',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.floorText = this.add
      .text(width / 2, 74, 'TẦNG 0', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#94a3b8',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    // Combo Container bên phải
    this.comboBadgeContainer = this.add.container(width - 160, 48).setDepth(10);

    const comboBg = this.add.graphics();
    comboBg.fillStyle(0x1e293b, 0.85);
    comboBg.fillRoundedRect(-80, -28, 160, 56, 12);
    comboBg.lineStyle(1.5, 0xf59e0b, 0.8);
    comboBg.strokeRoundedRect(-80, -28, 160, 56, 12);
    this.comboBadgeContainer.add(comboBg);

    this.comboText = this.add
      .text(0, -14, 'COMBO 0', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#fbbf24',
      })
      .setOrigin(0.5);
    this.comboBadgeContainer.add(this.comboText);

    this.comboSubText = this.add
      .text(0, 10, 'x1.0', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#94a3b8',
      })
      .setOrigin(0.5);
    this.comboBadgeContainer.add(this.comboSubText);
    this.comboBadgeContainer.setVisible(false);

    // Trạng thái thả ở đáy màn hình
    this.dropProgressBar = this.add.graphics().setDepth(10);

    this.dropStatusText = this.add
      .text(width / 2, DISPLAY_CONFIG.height - 35, 'NHẤN SPACE HOẶC CLICK ĐỂ THẢ KHỐI', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#38bdf8',
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Hướng dẫn phím tắt góc phải dưới
    this.add
      .text(width - 32, DISPLAY_CONFIG.height - 35, '[R] Chơi lại', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        color: '#64748b',
      })
      .setOrigin(1, 0.5)
      .setDepth(10);

    // Toast Container (hiển thị popup điểm khi thả)
    this.toastContainer = this.add
      .container(width / 2, 220)
      .setDepth(20)
      .setAlpha(0);

    this.toastText = this.add
      .text(0, 0, '', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#fbbf24',
        stroke: '#0f172a',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.toastContainer.add(this.toastText);

    this.toastSubText = this.add
      .text(0, 34, '', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#f8fafc',
        stroke: '#0f172a',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.toastContainer.add(this.toastSubText);
  }

  private createGameOverModal(width: number, height: number): void {
    this.gameOverContainer = this.add
      .container(width / 2, height / 2)
      .setDepth(100)
      .setVisible(false);

    // Màn chắn mờ tối
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x020617, 0.82);
    backdrop.fillRect(-width / 2, -height / 2, width, height);
    this.gameOverContainer.add(backdrop);

    // Khung thẻ thông tin
    const card = this.add.graphics();
    card.fillStyle(0x0f172a, 0.95);
    card.fillRoundedRect(-220, -190, 440, 380, 20);
    card.lineStyle(2, 0xef4444, 0.9);
    card.strokeRoundedRect(-220, -190, 440, 380, 20);
    this.gameOverContainer.add(card);

    const title = this.add
      .text(0, -145, 'THÁP ĐÃ SẬP!', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ef4444',
      })
      .setOrigin(0.5);
    this.gameOverContainer.add(title);

    const desc = this.add
      .text(0, -105, 'Khối chạm đất hoặc tháp bị nghiêng quá 25°', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        color: '#94a3b8',
      })
      .setOrigin(0.5);
    this.gameOverContainer.add(desc);

    // Thống kê
    this.modalScoreText = this.add
      .text(0, -50, 'Tổng điểm: 0', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#38bdf8',
      })
      .setOrigin(0.5);
    this.gameOverContainer.add(this.modalScoreText);

    this.modalFloorText = this.add
      .text(0, -15, 'Tầng cao nhất: 0', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);
    this.gameOverContainer.add(this.modalFloorText);

    this.modalComboText = this.add
      .text(0, 15, 'Combo cao nhất: 0', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        color: '#fbbf24',
      })
      .setOrigin(0.5);
    this.gameOverContainer.add(this.modalComboText);

    this.modalPerfectText = this.add
      .text(0, 45, 'Số lần Perfect: 0', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        color: '#a78bfa',
      })
      .setOrigin(0.5);
    this.gameOverContainer.add(this.modalPerfectText);

    // Nút Chơi lại
    const restartBtn = this.add
      .text(0, 120, 'CHƠI LẠI', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#0f172a',
        backgroundColor: '#38bdf8',
        padding: { x: 36, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    restartBtn.on('pointerover', () => restartBtn.setStyle({ backgroundColor: '#7dd3fc' }));
    restartBtn.on('pointerout', () => restartBtn.setStyle({ backgroundColor: '#38bdf8' }));
    restartBtn.on('pointerdown', () => this.handleRestart());

    this.gameOverContainer.add(restartBtn);
  }

  private setupInput(): void {
    // Click chuột trái
    this.input.on('pointerdown', () => {
      if (!this.gameOverContainer.visible) {
        this.handleDropAction();
      }
    });

    // Bàn phím Space & R
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.gameOverContainer.visible) {
        this.handleRestart();
      } else {
        this.handleDropAction();
      }
    });

    this.input.keyboard?.on('keydown-R', () => {
      this.handleRestart();
    });
  }

  private handleDropAction(): void {
    if (!this.controller || !this.isReady || this.controller.isGameOver) {
      return;
    }

    const blockId = this.controller.drop();
    if (blockId !== null) {
      // Hiệu ứng nhẹ khi vừa bấm thả
      this.dropStatusText.setText('KHỐI ĐANG RƠI...');
      this.dropStatusText.setColor('#f59e0b');
    }
  }

  private handleRestart(): void {
    if (!this.controller) return;

    this.controller.reset();
    this.cameraY = 0;
    this.gameOverContainer.setVisible(false);
    this.comboBadgeContainer.setVisible(false);
    this.dropStatusText.setText('NHẤN SPACE HOẶC CLICK ĐỂ THẢ KHỐI');
    this.dropStatusText.setColor('#38bdf8');
    this.scoreText.setText('0');
    this.floorText.setText('TẦNG 0');
  }

  override update(_time: number, delta: number): void {
    if (!this.controller || !this.isReady) {
      return;
    }

    const dt = Math.min(delta / 1000, 0.1); // Giới hạn dt tránh giật lag

    // Bước mô phỏng vật lý và cập nhật tiến trình thả
    const dropEvent = this.controller.advance(dt);
    if (dropEvent) {
      this.onDropFinished(dropEvent);
    }

    // Camera theo dõi đỉnh tháp mượt mà (lerp 0.1)
    const topY = this.controller.sim.getTopY();
    const targetCamY = Math.max(0, (topY - PHYS_CONFIG.baseHeight) * PHYS_CONFIG.pxPerUnit);
    this.cameraY += (targetCamY - this.cameraY) * CAMERA_CONFIG.lerp;

    // Cập nhật giao diện HUD
    this.updateHud();

    // Render toàn bộ đồ hoạ trò chơi
    this.renderScene();
  }

  private onDropFinished(event: DropEvent): void {
    const { result, score } = event;

    if (result === 'perfect') {
      const bonusText = score.isComboActive
        ? `+${score.addedScore} (x${SCORE_CONFIG.comboMul} Combo!)`
        : `+${score.addedScore}`;
      this.showToast('PERFECT!', bonusText, '#fbbf24', '#fef08a');
      this.createSparkles(
        this.screenCenterX,
        this.groundScreenY - this.controller!.sim.getTopY() * PHYS_CONFIG.pxPerUnit + this.cameraY,
      );
    } else if (result === 'success') {
      this.showToast('THÀNH CÔNG!', `+${score.addedScore} Điểm`, '#34d399', '#a7f3d0');
    } else if (result === 'miss') {
      this.showToast('TRƯỢT!', '0 Điểm (Reset Combo)', '#f97316', '#fdba74');
    } else if (result === 'collapse') {
      this.showToast('SẬP THÁP!', 'Tháp đã sập hoàn toàn', '#ef4444', '#fca5a5');
      // Rung màn hình nhẹ khi sập (mục 8.3 PLAN.md)
      this.cameras.main.shake(400, 0.015);

      // Hiển thị modal Game Over sau 0.5s
      this.time.delayedCall(500, () => {
        this.showGameOverModal();
      });
    }
  }

  private showToast(title: string, sub: string, color: string, subColor: string): void {
    if (this.toastTween) {
      this.toastTween.stop();
    }

    this.toastText.setText(title).setColor(color);
    this.toastSubText.setText(sub).setColor(subColor);

    this.toastContainer.setAlpha(1).setScale(0.8).setY(180);

    this.toastTween = this.tweens.add({
      targets: this.toastContainer,
      y: 150,
      scale: 1.1,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
    });
  }

  private createSparkles(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(60, 180);
      const spark = this.add.circle(x, y, Phaser.Math.FloatBetween(2, 4), 0xfbbf24, 0.9);
      spark.setDepth(15);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(400, 700),
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private showGameOverModal(): void {
    if (!this.controller) return;

    const stats = this.controller.scoreTracker.getState();
    this.modalScoreText.setText(`Tổng điểm: ${stats.score}`);
    this.modalFloorText.setText(`Tầng cao nhất: ${stats.floors}`);
    this.modalComboText.setText(`Combo cao nhất: ${stats.maxCombo}`);
    this.modalPerfectText.setText(`Số lần Perfect: ${stats.perfectCount}`);

    this.gameOverContainer.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: this.gameOverContainer,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });
  }

  private updateHud(): void {
    if (!this.controller) return;

    const score = this.controller.scoreTracker.score;
    const floors = this.controller.scoreTracker.floors;
    const combo = this.controller.scoreTracker.combo;

    this.scoreText.setText(score.toString());
    this.floorText.setText(`TẦNG ${floors}`);

    // Cập nhật Combo Badge
    if (combo > 0) {
      this.comboBadgeContainer.setVisible(true);
      this.comboText.setText(`COMBO ${combo}`);
      if (combo >= SCORE_CONFIG.comboStart) {
        this.comboSubText.setText(`x${SCORE_CONFIG.comboMul} ĐIỂM!`).setColor('#fbbf24');
      } else {
        this.comboSubText
          .setText(`${combo}/${SCORE_CONFIG.comboStart} tới x${SCORE_CONFIG.comboMul}`)
          .setColor('#94a3b8');
      }
    } else {
      this.comboBadgeContainer.setVisible(false);
    }

    // Cooldown bar & Status
    if (!this.controller.isGameOver) {
      if (this.controller.isSettling) {
        this.dropStatusText.setText('ĐANG ĐÁNH GIÁ ĐỘ ỔN ĐỊNH...');
        this.dropStatusText.setColor('#f59e0b');
      } else {
        const remaining = this.controller.crane.getCooldownRemaining(this.controller.sim.time);
        if (remaining > 0) {
          const pct = 1 - remaining / CRANE_CONFIG.dropCooldown;
          this.dropStatusText.setText(`ĐANG NẠP KHỐI MỚI (${remaining.toFixed(1)}s)`);
          this.dropStatusText.setColor('#94a3b8');

          this.dropProgressBar.clear();
          this.dropProgressBar.fillStyle(0x334155, 0.7);
          this.dropProgressBar.fillRoundedRect(
            this.screenCenterX - 120,
            DISPLAY_CONFIG.height - 52,
            240,
            6,
            3,
          );
          this.dropProgressBar.fillStyle(0x38bdf8, 1);
          this.dropProgressBar.fillRoundedRect(
            this.screenCenterX - 120,
            DISPLAY_CONFIG.height - 52,
            240 * pct,
            6,
            3,
          );
        } else {
          this.dropStatusText.setText('SẴN SÀNG - NHẤN SPACE HOẶC CLICK ĐỂ THẢ');
          this.dropStatusText.setColor('#38bdf8');
          this.dropProgressBar.clear();
        }
      }
    }
  }

  private renderScene(): void {
    if (!this.controller) return;

    const { width, height } = this.scale;
    const topY = this.controller.sim.getTopY();
    const craneState = this.controller.crane.getState(this.controller.sim.time, topY);

    // 1. Vẽ nền trời ban đêm & sao parallax
    this.bgGraphics.clear();
    this.bgGraphics.fillGradientStyle(0x0a0f1d, 0x0a0f1d, 0x1e1b4b, 0x0f172a, 1);
    this.bgGraphics.fillRect(0, 0, width, height);

    for (const star of this.stars) {
      const starScreenY = (star.y + this.cameraY * star.speed) % height;
      this.bgGraphics.fillStyle(0xffffff, star.alpha);
      this.bgGraphics.fillCircle(star.x, starScreenY, star.size);
    }

    // 2. Vẽ thế giới vật lý (mặt đất, nền móng, các khối tháp)
    this.worldGraphics.clear();

    // 2.1 Mặt đất
    const groundPxY = this.groundScreenY + this.cameraY;
    if (groundPxY < height + 200) {
      // Đất
      this.worldGraphics.fillStyle(0x1e293b, 1);
      this.worldGraphics.fillRect(0, groundPxY, width, height - groundPxY + 200);

      // Đường viền neon mặt đất
      this.worldGraphics.lineStyle(2, 0x475569, 1);
      this.worldGraphics.lineBetween(0, groundPxY, width, groundPxY);
    }

    // 2.2 Nền móng (Base)
    const basePxW = PHYS_CONFIG.baseWidth * PHYS_CONFIG.pxPerUnit; // 200px
    const basePxH = PHYS_CONFIG.baseHeight * PHYS_CONFIG.pxPerUnit; // 50px
    const baseX = this.screenCenterX - basePxW / 2;
    const baseY = groundPxY - basePxH;

    if (baseY < height && baseY + basePxH > 0) {
      // Khối nền móng vững chắc
      this.worldGraphics.fillStyle(0x334155, 1);
      this.worldGraphics.fillRoundedRect(baseX, baseY, basePxW, basePxH, 6);

      // Điểm nhấn viền nền
      this.worldGraphics.lineStyle(2, 0x64748b, 1);
      this.worldGraphics.strokeRoundedRect(baseX, baseY, basePxW, basePxH, 6);

      // Vạch tâm nền móng
      this.worldGraphics.lineStyle(1.5, 0x38bdf8, 0.7);
      this.worldGraphics.lineBetween(
        this.screenCenterX,
        baseY,
        this.screenCenterX,
        baseY + basePxH,
      );
    }

    // 2.3 Các khối đã đặt & khối đang rơi
    const blocks = this.controller.sim.getBlocks();
    for (const b of blocks) {
      const pxX = this.screenCenterX + (b.x - this.controller.sim.baseX) * PHYS_CONFIG.pxPerUnit;
      const pxY = this.groundScreenY - b.y * PHYS_CONFIG.pxPerUnit + this.cameraY;
      const bW = b.width * PHYS_CONFIG.pxPerUnit;
      const bH = b.height * PHYS_CONFIG.pxPerUnit;

      if (pxY > -100 && pxY < height + 100) {
        const isPlacing = b.id === this.controller.activeBlockId;

        // Lưu trạng thái canvas để xoay góc
        this.worldGraphics.save();
        this.worldGraphics.translateCanvas(pxX, pxY);
        // Lưu ý: góc vật lý ngược chiều kim đồng hồ với trục y hướng lên -> góc render là -angle
        this.worldGraphics.rotateCanvas(-b.angle);

        // Màu khối: màu xanh ngọc hiện đại, nếu đang rơi thì viền sáng hơn
        const fillColor = isPlacing ? 0x38bdf8 : 0x0ea5e9;
        const strokeColor = isPlacing ? 0xfef08a : 0x7dd3fc;

        this.worldGraphics.fillStyle(fillColor, 1);
        this.worldGraphics.fillRoundedRect(-bW / 2, -bH / 2, bW, bH, 5);

        // Vạch bóng viền trên
        this.worldGraphics.fillStyle(0xffffff, 0.2);
        this.worldGraphics.fillRoundedRect(-bW / 2 + 2, -bH / 2 + 2, bW - 4, bH / 3, 3);

        this.worldGraphics.lineStyle(isPlacing ? 2.5 : 1.5, strokeColor, 1);
        this.worldGraphics.strokeRoundedRect(-bW / 2, -bH / 2, bW, bH, 5);

        this.worldGraphics.restore();
      }
    }

    // 2.4 Cần cẩu (Crane)
    const cranePxX =
      this.screenCenterX + (craneState.x - this.controller.sim.baseX) * PHYS_CONFIG.pxPerUnit;
    const cranePxY = this.groundScreenY - craneState.y * PHYS_CONFIG.pxPerUnit + this.cameraY;

    // Thanh ray cẩu trên cùng
    const railY = cranePxY - 80;
    this.worldGraphics.lineStyle(4, 0x475569, 0.9);
    this.worldGraphics.lineBetween(40, railY, width - 40, railY);

    // Cỗ xe cẩu (Trolley) trượt trên thanh ray
    this.worldGraphics.fillStyle(0x334155, 1);
    this.worldGraphics.fillRoundedRect(cranePxX - 22, railY - 12, 44, 24, 4);
    this.worldGraphics.lineStyle(1.5, 0x94a3b8, 1);
    this.worldGraphics.strokeRoundedRect(cranePxX - 22, railY - 12, 44, 24, 4);

    // Dây cáp treo từ xe xuống móc
    this.worldGraphics.lineStyle(2, 0x94a3b8, 0.85);
    this.worldGraphics.lineBetween(cranePxX, railY + 12, cranePxX, cranePxY - 15);

    // Móc cẩu (Hook / Claw)
    this.worldGraphics.fillStyle(0xf59e0b, 1);
    this.worldGraphics.fillCircle(cranePxX, cranePxY - 10, 8);
    this.worldGraphics.lineStyle(2, 0xd97706, 1);
    this.worldGraphics.strokeCircle(cranePxX, cranePxY - 10, 8);

    // Nếu cẩu đã sẵn sàng và không trong thời gian cooldown: vẽ khối mẫu đang ngậm ở móc cẩu
    if (
      this.controller.crane.canDrop(this.controller.sim.time) &&
      !this.controller.isSettling &&
      !this.controller.isGameOver
    ) {
      const nextW = PHYS_CONFIG.blockW * PHYS_CONFIG.pxPerUnit;
      const nextH = PHYS_CONFIG.blockH * PHYS_CONFIG.pxPerUnit;

      this.worldGraphics.fillStyle(0x38bdf8, 0.9);
      this.worldGraphics.fillRoundedRect(
        cranePxX - nextW / 2,
        cranePxY - nextH / 2,
        nextW,
        nextH,
        5,
      );
      this.worldGraphics.lineStyle(2, 0xfef08a, 0.9);
      this.worldGraphics.strokeRoundedRect(
        cranePxX - nextW / 2,
        cranePxY - nextH / 2,
        nextW,
        nextH,
        5,
      );

      // Càng kẹp giữ khối
      this.worldGraphics.lineStyle(3, 0xf59e0b, 1);
      this.worldGraphics.lineBetween(
        cranePxX - nextW / 2 - 4,
        cranePxY - 8,
        cranePxX - nextW / 2,
        cranePxY + 8,
      );
      this.worldGraphics.lineBetween(
        cranePxX + nextW / 2 + 4,
        cranePxY - 8,
        cranePxX + nextW / 2,
        cranePxY + 8,
      );
    }
  }

  cleanup(): void {
    if (this.controller) {
      this.controller.dispose();
      this.controller = null;
    }
  }
}
