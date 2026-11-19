import { KART_CONFIG } from '../config';

export class RaceTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.lap = 1;
    this.checkpoints = { cp1: false, cp2: false, cp3: false };
    this.raceTime = 0;
    this.currentLapTime = 0;
    this.bestLapTime = null;
    this.lapBanner = null;
    this.lapBannerTimer = 0;
    this.wrongWayTimer = 0;
    this.isWrongWay = false;
    this.isFinished = false;
  }

  update(delta, surfaceInfo, kartHeading, kartSpeed, isSpinningOut = false) {
    if (!this.isFinished) {
      this.raceTime += delta;
      this.currentLapTime += delta;
      this.evaluateCheckpoints(surfaceInfo.u);
      this.evaluateWrongWay(delta, surfaceInfo.tangent, kartHeading, kartSpeed, isSpinningOut);
    } else {
      this.isWrongWay = false;
      this.wrongWayTimer = 0;
    }

    if (this.lapBannerTimer > 0) {
      this.lapBannerTimer = Math.max(0, this.lapBannerTimer - delta);
      if (this.lapBannerTimer === 0) {
        this.lapBanner = null;
      }
    }
  }

  evaluateWrongWay(delta, trackTangent, kartHeading, kartSpeed, isSpinningOut) {
    if (!trackTangent || isSpinningOut) {
      this.wrongWayTimer = 0;
      this.isWrongWay = false;
      return;
    }

    // Prend en compte un demi-tour (speed >= 0) OU une marche arrière prolongée (speed < -2)
    const directionSign = kartSpeed < -2 ? -1 : 1;
    const moveX = Math.sin(kartHeading) * directionSign;
    const moveZ = Math.cos(kartHeading) * directionSign;

    const alignment = moveX * trackTangent.x + moveZ * trackTangent.z;

    if (alignment < -0.35) {
      this.wrongWayTimer += delta;
      if (this.wrongWayTimer >= 0.4) {
        this.isWrongWay = true;
      }
    } else {
      this.wrongWayTimer = 0;
      this.isWrongWay = false;
    }
  }

  evaluateCheckpoints(u) {
    if (u >= 0.18 && u <= 0.40) {
      this.checkpoints.cp1 = true;
    } else if (this.checkpoints.cp1 && u >= 0.42 && u <= 0.68) {
      this.checkpoints.cp2 = true;
    } else if (this.checkpoints.cp2 && u >= 0.70 && u <= 0.92) {
      this.checkpoints.cp3 = true;
    }

    if (this.checkpoints.cp1 && this.checkpoints.cp2 && this.checkpoints.cp3 && u < 0.14) {
      this.completeLap();
    }
  }

  completeLap() {
    this.checkpoints = { cp1: false, cp2: false, cp3: false };

    if (this.bestLapTime === null || this.currentLapTime < this.bestLapTime) {
      this.bestLapTime = this.currentLapTime;
    }
    this.currentLapTime = 0;

    if (this.lap >= KART_CONFIG.TOTAL_LAPS) {
      this.isFinished = true;
      this.lapBanner = null;
      return;
    }

    this.lap += 1;
    this.lapBanner =
      this.lap === KART_CONFIG.TOTAL_LAPS
        ? 'DERNIER TOUR !'
        : `TOUR ${this.lap} / ${KART_CONFIG.TOTAL_LAPS}`;
    this.lapBannerTimer = 2.4;
  }

  getState() {
    return {
      lap: this.lap,
      totalLaps: KART_CONFIG.TOTAL_LAPS,
      raceTime: this.raceTime,
      currentLapTime: this.currentLapTime,
      bestLapTime: this.bestLapTime,
      lapBanner: this.lapBanner,
      isWrongWay: this.isWrongWay,
      isFinished: this.isFinished,
    };
  }
}