import * as THREE from 'three';
import { KART_CONFIG } from '../config';
import { KartMesh } from './KartMesh';

const _pushDir = new THREE.Vector3();

export class Kart {
  constructor(scene, track) {
    this.track = track;
    this.view = new KartMesh();
    this.mesh = this.view.root;

    this.speed = 0;
    this.heading = 0;
    this.isOffRoad = false;
    this.lastSampleIndex = -1;

    this.hopHeight = 0;
    this.hopVelocity = 0;
    this.wasDriftPressed = false;
    this.driftBufferTimer = 0;
    this.isDrifting = false;
    this.driftDirection = 0;
    this.driftEase = 0;
    this.driftTime = 0;
    this.driftLevel = 0;
    this.boostTimer = 0;
    this.starTimer = 0;
    this.bulletTimer = 0;
    this.spinOutTimer = 0;

    this.reset();
    scene.add(this.mesh);
  }

  reset() {
    const start = this.track.getStartTransform();
    this.mesh.position.copy(start.position);
    this.heading = start.heading;
    this.speed = 0;
    this.isOffRoad = false;
    this.lastSampleIndex = -1;

    this.hopHeight = 0;
    this.hopVelocity = 0;
    this.driftBufferTimer = 0;
    this.isDrifting = false;
    this.driftDirection = 0;
    this.driftEase = 0;
    this.driftTime = 0;
    this.driftLevel = 0;
    this.boostTimer = 0;
    this.starTimer = 0;
    this.bulletTimer = 0;
    this.spinOutTimer = 0;

    this.view.reset();
  }

  isInvincible() {
    return this.starTimer > 0 || this.bulletTimer > 0;
  }

  triggerBoost(duration) {
    if (this.spinOutTimer > 0 || this.bulletTimer > 0) return;
    this.boostTimer = Math.max(this.boostTimer, duration);
  }

  triggerStar(duration) {
    this.spinOutTimer = 0;
    this.view.visualGroup.rotation.y = 0;
    this.starTimer = Math.max(this.starTimer, duration);
  }

  triggerBullet(duration) {
    this.spinOutTimer = 0;
    this.boostTimer = 0;
    this.isDrifting = false;
    this.driftLevel = 0;
    this.driftTime = 0;
    this.driftBufferTimer = 0;
    this.hopHeight = 0;
    this.hopVelocity = 0;
    this.bulletTimer = Math.max(this.bulletTimer, duration);
  }

  triggerSpinOut() {
    if (this.spinOutTimer > 0 || this.isInvincible()) return;

    // Coupe immédiatement tout boost et dérapage en cours
    this.spinOutTimer = KART_CONFIG.SPINOUT_DURATION;
    this.boostTimer = 0;
    this.isDrifting = false;
    this.driftDirection = 0;
    this.driftEase = 0;
    this.driftLevel = 0;
    this.driftTime = 0;
    this.driftBufferTimer = 0;

    // Petit saut d'impact et forte perte de vitesse
    this.hopHeight = 0;
    this.hopVelocity = 3.6;
    this.speed *= 0.2;
  }

  resolveWallCollision() {
    const surface = this.track.getSurfaceInfo(this.mesh.position, this.lastSampleIndex);
    this.lastSampleIndex = surface.sampleIndex;

    if (surface.isOutOfBounds) {
      _pushDir.subVectors(surface.closestPoint, this.mesh.position).normalize();
      this.mesh.position.addScaledVector(_pushDir, surface.distance - KART_CONFIG.WALL_HALF_WIDTH);
      this.speed *= 0.94;
    }
    return surface;
  }

  update(delta, keys) {
    const {
      MAX_SPEED,
      MAX_REVERSE,
      ACCELERATION,
      BRAKING,
      FRICTION,
      TURN_SPEED,
      OFFROAD_SPEED_MULT,
      MIN_DRIFT_SPEED,
      DRIFT_TURN_NEUTRAL,
      DRIFT_TURN_INWARD,
      DRIFT_TURN_OUTWARD,
      DRIFT_SLIDE_SPEED,
      DRIFT_L1_TIME,
      DRIFT_L2_TIME,
      BOOST_L1_DURATION,
      BOOST_L2_DURATION,
      BOOST_SPEED_MULT,
      BULLET_SPEED,
    } = KART_CONFIG;

    // 0. MODE FUSÉE (Pilote automatique le long du circuit)
    if (this.bulletTimer > 0) {
      this.bulletTimer = Math.max(0, this.bulletTimer - delta);
      this.wasDriftPressed = keys.drift;
      this.isOffRoad = false;

      const currentSurface = this.track.getSurfaceInfo(this.mesh.position, this.lastSampleIndex);
      this.lastSampleIndex = currentSurface.sampleIndex;

      const targetPt = this.track.getLookAheadPoint(currentSurface.u, 0.028);
      const targetHeading = Math.atan2(
        targetPt.x - this.mesh.position.x,
        targetPt.z - this.mesh.position.z
      );

      // Interpolation angulaire la plus courte
      let angleDiff = ((targetHeading - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.heading += angleDiff * Math.min(1, 10 * delta);

      this.speed = BULLET_SPEED;
      this.mesh.rotation.y = this.heading;
      this.mesh.position.x += Math.sin(this.heading) * this.speed * delta;
      this.mesh.position.z += Math.cos(this.heading) * this.speed * delta;

      // Relâche avec un léger mini-turbo à la fin de la fusée
      if (this.bulletTimer === 0) {
        this.boostTimer = 0.6;
      }

      const surfaceAfter = this.resolveWallCollision();
      this.view.updateVisuals(delta, {
        hopHeight: 0,
        isDrifting: false,
        driftDirection: 0,
        driftEase: 0,
        driftLevel: 0,
        steerInput: 0,
        speedRatio: 1,
        isBoosting: false,
        isStar: false,
        isBullet: true,
      });
      return surfaceAfter;
    }

    // 1. GESTION DU TÊTE-À-QUEUE
    if (this.spinOutTimer > 0) {
      this.spinOutTimer = Math.max(0, this.spinOutTimer - delta);
      this.wasDriftPressed = keys.drift;
      this.speed = THREE.MathUtils.lerp(this.speed, 0, 5.5 * delta);

      if (this.hopHeight > 0 || this.hopVelocity > 0) {
        this.hopHeight += this.hopVelocity * delta;
        this.hopVelocity -= 42 * delta;
        if (this.hopHeight <= 0) {
          this.hopHeight = 0;
          this.hopVelocity = 0;
        }
      }

      this.mesh.position.x += Math.sin(this.heading) * this.speed * delta;
      this.mesh.position.z += Math.cos(this.heading) * this.speed * delta;
      this.view.visualGroup.position.y = this.hopHeight;
      this.view.visualGroup.rotation.y += 15 * delta;
      this.view.updateSparks(false, false, false, 0);
      return this.resolveWallCollision();
    }

    const steerInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);

    // 2. DÉRAPAGE ET MICRO-REBOND
    const justPressedDrift = keys.drift && !this.wasDriftPressed;
    this.wasDriftPressed = keys.drift;

    if (justPressedDrift && !this.isDrifting) {
      this.driftBufferTimer = 0.12;
    } else if (this.driftBufferTimer > 0) {
      this.driftBufferTimer = Math.max(0, this.driftBufferTimer - delta);
    }

    if (keys.drift && this.speed >= MIN_DRIFT_SPEED) {
      if (!this.isDrifting && this.driftBufferTimer > 0 && steerInput !== 0) {
        this.isDrifting = true;
        this.driftBufferTimer = 0;
        this.driftDirection = steerInput;
        this.driftEase = 0;
        this.driftTime = 0;
        this.driftLevel = 0;
        if (this.hopHeight === 0) this.hopVelocity = 3.2;
      }
    } else {
      this.driftBufferTimer = 0;
      if (this.isDrifting) {
        if (this.driftLevel === 1) this.triggerBoost(BOOST_L1_DURATION);
        else if (this.driftLevel === 2) this.triggerBoost(BOOST_L2_DURATION);

        this.isDrifting = false;
        this.driftDirection = 0;
        this.driftEase = 0;
        this.driftTime = 0;
        this.driftLevel = 0;
      }
    }

    if (this.hopHeight > 0 || this.hopVelocity > 0) {
      this.hopHeight += this.hopVelocity * delta;
      this.hopVelocity -= 42 * delta;
      if (this.hopHeight <= 0) {
        this.hopHeight = 0;
        this.hopVelocity = 0;
      }
    }

    if (this.isDrifting) {
      this.driftEase = Math.min(1, this.driftEase + delta * 5.5);
      this.driftTime += delta * (steerInput === this.driftDirection ? 1.25 : 1.0);
      if (this.driftTime >= DRIFT_L2_TIME) this.driftLevel = 2;
      else if (this.driftTime >= DRIFT_L1_TIME) this.driftLevel = 1;
    }

    // 3. SURFACE, VITESSE, BOOST ET ÉTOILE
    const surfaceBefore = this.track.getSurfaceInfo(this.mesh.position, this.lastSampleIndex);
    this.isOffRoad = surfaceBefore.isOffRoad;

    this.boostTimer = Math.max(0, this.boostTimer - delta);
    this.starTimer = Math.max(0, this.starTimer - delta);

    const isBoosting = this.boostTimer > 0;
    const isStar = this.starTimer > 0;

    let currentMaxSpeed = MAX_SPEED;
    if (isBoosting) currentMaxSpeed = MAX_SPEED * BOOST_SPEED_MULT;
    else if (isStar) currentMaxSpeed = MAX_SPEED * 1.32;
    else if (this.isOffRoad) currentMaxSpeed = MAX_SPEED * OFFROAD_SPEED_MULT;

    if (isBoosting) {
      this.speed = THREE.MathUtils.lerp(this.speed, currentMaxSpeed, 6 * delta);
    } else if (keys.forward) {
      this.speed =
        this.speed > currentMaxSpeed
          ? THREE.MathUtils.lerp(this.speed, currentMaxSpeed, 5 * delta)
          : this.speed + (isStar ? ACCELERATION * 1.4 : ACCELERATION) * delta;
    } else if (keys.backward) {
      this.speed -= (this.speed > 0 ? BRAKING : ACCELERATION * 0.7) * delta;
    } else {
      this.speed =
        Math.abs(this.speed) < FRICTION * delta
          ? 0
          : this.speed - Math.sign(this.speed) * FRICTION * delta;
    }

    this.speed = THREE.MathUtils.clamp(this.speed, MAX_REVERSE, currentMaxSpeed);

    // 4. DIRECTION ET DÉPLACEMENT
    if (this.isDrifting) {
      const relativeSteer = steerInput * this.driftDirection;
      const targetTurn =
        relativeSteer >= 0
          ? THREE.MathUtils.lerp(DRIFT_TURN_NEUTRAL, DRIFT_TURN_INWARD, relativeSteer)
          : THREE.MathUtils.lerp(DRIFT_TURN_NEUTRAL, DRIFT_TURN_OUTWARD, -relativeSteer);

      this.heading += this.driftDirection * targetTurn * this.driftEase * delta;
    } else if (Math.abs(this.speed) > 0.3) {
      this.heading += steerInput * TURN_SPEED * Math.sign(this.speed) * delta;
    }

    this.mesh.rotation.y = this.heading;
    this.mesh.position.x += Math.sin(this.heading) * this.speed * delta;
    this.mesh.position.z += Math.cos(this.heading) * this.speed * delta;

    if (this.isDrifting) {
      const slide = DRIFT_SLIDE_SPEED * this.driftEase * (this.speed / MAX_SPEED);
      this.mesh.position.x += -this.driftDirection * Math.cos(this.heading) * slide * delta;
      this.mesh.position.z += this.driftDirection * Math.sin(this.heading) * slide * delta;
    }

    const surfaceAfter = this.resolveWallCollision();

    // 5. RENDU VISUEL
    this.view.updateVisuals(delta, {
      hopHeight: this.hopHeight,
      isDrifting: this.isDrifting,
      driftDirection: this.driftDirection,
      driftEase: this.driftEase,
      driftLevel: this.driftLevel,
      steerInput,
      speedRatio: Math.min(Math.abs(this.speed) / MAX_SPEED, 1),
      isBoosting,
      isStar,
      isBullet: false,
    });

    return surfaceAfter;
  }

  getSpeedKmh() {
    return Math.round(Math.abs(this.speed) * 3.5);
  }

  dispose() {
    this.view.dispose();
  }
}