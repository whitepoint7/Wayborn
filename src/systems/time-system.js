import Phaser from "phaser";

export class TimeSystem {
  constructor(scene, { dayDurationMs = 720000 } = {}) {
    this.scene = scene;
    this.dayDurationMs = dayDurationMs;
  }

  update(delta) {
    const scene = this.scene;
    if (scene.isGameOver) return;
    const previousDay = scene.worldDay;
    scene.dayProgress = (scene.dayProgress + delta / this.dayDurationMs) % 1;
    if (scene.dayProgress < scene.lastDayProgress) scene.worldDay += 1;
    scene.lastDayProgress = scene.dayProgress;
    if (scene.worldDay !== previousDay) scene.weatherSystem.beginDay(scene.worldDay);
    scene.weatherSystem.updateForecast(scene.dayProgress);
    this.updateLighting();
  }

  updateLighting() {
    const scene = this.scene;
    if (!scene.nightOverlay) return;
    const hour = this.getHour();
    const maxNightAlpha = 0.92;
    let alpha = 0;
    if (hour < 5) alpha = maxNightAlpha;
    else if (hour < 7) alpha = Phaser.Math.Linear(maxNightAlpha, 0, (hour - 5) / 2);
    else if (hour >= 19 && hour < 21) alpha = Phaser.Math.Linear(0, maxNightAlpha, (hour - 19) / 2);
    else if (hour >= 21) alpha = maxNightAlpha;
    scene.isNight = alpha > 0.25;
    const torchRelief = scene.hasTorch && scene.isNight ? 0.2 : 0;
    scene.nightOverlay.setAlpha(Math.max(0, alpha - torchRelief));
    scene.updateTorchVisual?.(alpha);
  }

  getHour() {
    return this.scene.dayProgress * 24;
  }

  getTimeLabel() {
    const hour = this.getHour();
    const hours = Math.floor(hour).toString().padStart(2, "0");
    const minutes = Math.floor((hour % 1) * 60).toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  getPeriodLabel() {
    const hour = this.getHour();
    if (hour < 5) return "Gece";
    if (hour < 8) return "Sabah";
    if (hour < 18) return "Gunduz";
    if (hour < 21) return "Aksam";
    return "Gece";
  }
}
