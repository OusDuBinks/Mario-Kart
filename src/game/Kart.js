import * as THREE from 'three';
import { KART_CONFIG } from './config';

export class Kart {
  constructor(scene, track) {
    this.track = track;
    this.mesh = new THREE.Group();
    this.visualGroup = new THREE.Group();
    this.mesh.add(this.visualGroup);

    this.speed = 0;
    this.heading = 0;
    this.isOffRoad = false;

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
    this.spinOutTimer = 0;

    this.buildMesh();
    this.reset();
    scene.add(this.mesh);
  }

  buildMesh() {
    this.chassisMat = new THREE.MeshStandardMaterial({ color: 0xe62e2e });
    this.chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.5, 2.6),
      this.chassisMat
    );
    this.chassis.position.y = 0.55;
    this.chassis.castShadow = true;
    this.visualGroup.add(this.chassis);

    const driver = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xffcc00 })
    );
    driver.position.set(0, 1.1, -0.1);
    driver.castShadow = true;
    this.visualGroup.add(driver);

    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    const wheelPositions = [
      [-0.95, 0.4, 0.85],
      [0.95, 0.4, 0.85],
      [-0.95, 0.4, -0.85],
      [0.95, 0.4, -0.85],
    ];

    this.wheels = wheelPositions.map(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      this.visualGroup.add(wheel);
      return wheel;
    });

    const sparkGeo = new THREE.SphereGeometry(0.32, 8, 8);
    this.sparkMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0,
    });

    this.sparks = [-1.05, 1.05].map((x) => {
      const spark = new THREE.Mesh(sparkGeo, this.sparkMat);
      spark.position.set(x, 0.35, -1.25);
      this.visualGroup.add(spark);
      return spark;
    });
  }

  reset() {
    const start = this.track.getStartTransform();
    this.mesh.position.copy(start.position);
    this.heading = start.heading;
    this.speed = 0;
    this.isOffRoad = false;
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
    this.spinOutTimer = 0;
    this.chassisMat.color.setHex(0xe62e2e);
    this.visualGroup.rotation.set(0, 0, 0);
  }

  triggerBoost(duration) {
    if (this.spinOutTimer > 0) return;
    this.boostTimer = Math.max(this.boostTimer, duration);
  }

  triggerStar(duration) {
    this.spinOutTimer = 0;
    this.visualGroup.rotation.y = 0;
    this.starTimer = Math.max(this.starTimer, duration);
  }

  triggerSpinOut() {
    if (this.spinOutTimer > 0 || this.starTimer > 0) return;
    this.spinOutTimer = KART_CONFIG.SPINOUT_DURATION;
    this.boostTimer = 0;
    this.isDrifting = false;
    this.driftLevel = 0;
    this.driftTime = 0;
    this.speed *= 0.35;
  }

  update(delta, keys) {
    const {
      MAX_SPEED,
      MAX_REVERSE,
      ACCELERATION,
      BRAKING,
      FRICTION,
      TURN_SPEED,
      WALL_HALF_WIDTH,
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
    } = KART_CONFIG;

    // 0. GESTION DU TÊTE-À-QUEUE
    if (this.spinOutTimer > 0) {
      this.spinOutTimer = Math.max(0, this.spinOutTimer - delta);
      this.speed = THREE.MathUtils.lerp(this.speed, 0, 3.5 * delta);
      this.mesh.position.x += Math.sin(this.heading) * this.speed * delta;
      this.mesh.position.z += Math.cos(this.heading) * this.speed * delta;
      this.visualGroup.rotation.y += 14 * delta;
      this.updateSparks(false, false);

      const surfaceAfter = this.track.getSurfaceInfo(this.mesh.position);
      if (surfaceAfter.isOutOfBounds) {
        const pushDir = surfaceAfter.closestPoint.clone().sub(this.mesh.position).normalize();
        this.mesh.position.addScaledVector(pushDir, surfaceAfter.distance - WALL_HALF_WIDTH);
      }
      return surfaceAfter;
    }

    let steerInput = 0;
    if (keys.left) steerInput += 1;
    if (keys.right) steerInput -= 1;

    // 1. DÉTECTION DE L'INTENTION DE DRIFT
    const justPressedDrift = keys.drift && !this.wasDriftPressed;
    this.wasDriftPressed = keys.drift;

    if (justPressedDrift && !this.isDrifting) {
      this.driftBufferTimer = 0.12;
    } else if (this.driftBufferTimer > 0) {
      this.driftBufferTimer = Math.max(0, this.driftBufferTimer - delta);
    }

    // 2. DÉCLENCHEMENT SIMULTANÉ DU DRIFT ET DU MICRO-REBOND
    if (keys.drift && this.speed >= MIN_DRIFT_SPEED) {
      if (!this.isDrifting && this.driftBufferTimer > 0 && steerInput !== 0) {
        this.isDrifting = true;
        this.driftBufferTimer = 0;
        this.driftDirection = steerInput;
        this.driftEase = 0;
        this.driftTime = 0;
        this.driftLevel = 0;

        if (this.hopHeight === 0) {
          this.hopVelocity = 3.2;
        }
      }
    } else {
      this.driftBufferTimer = 0;
      if (this.isDrifting) {
        if (this.driftLevel === 1) {
          this.triggerBoost(BOOST_L1_DURATION);
        } else if (this.driftLevel === 2) {
          this.triggerBoost(BOOST_L2_DURATION);
        }
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
    this.visualGroup.position.y = this.hopHeight;

    if (this.isDrifting) {
      this.driftEase = Math.min(1, this.driftEase + delta * 5.5);
      const chargeRate = steerInput === this.driftDirection ? 1.25 : 1.0;
      this.driftTime += delta * chargeRate;

      if (this.driftTime >= DRIFT_L2_TIME) {
        this.driftLevel = 2;
      } else if (this.driftTime >= DRIFT_L1_TIME) {
        this.driftLevel = 1;
      }
    }

    // 3. SURFACE, VITESSE, BOOST ET ÉTOILE
    const surfaceBefore = this.track.getSurfaceInfo(this.mesh.position);
    this.isOffRoad = surfaceBefore.isOffRoad;

    if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - delta);
    }
    if (this.starTimer > 0) {
      this.starTimer = Math.max(0, this.starTimer - delta);
      this.chassisMat.color.setHSL((performance.now() * 0.0025) % 1, 0.9, 0.52);
    } else {
      this.chassisMat.color.setHex(0xe62e2e);
    }

    const isBoosting = this.boostTimer > 0;
    const isStar = this.starTimer > 0;
    let currentMaxSpeed = MAX_SPEED;

    if (isBoosting) {
      currentMaxSpeed = MAX_SPEED * BOOST_SPEED_MULT;
    } else if (isStar) {
      currentMaxSpeed = MAX_SPEED * 1.32;
    } else if (this.isOffRoad) {
      currentMaxSpeed = MAX_SPEED * OFFROAD_SPEED_MULT;
    }

    if (isBoosting) {
      this.speed = THREE.MathUtils.lerp(this.speed, currentMaxSpeed, 6 * delta);
    } else if (keys.forward) {
      if (this.speed > currentMaxSpeed) {
        this.speed = THREE.MathUtils.lerp(this.speed, currentMaxSpeed, 5 * delta);
      } else {
        this.speed += (isStar ? ACCELERATION * 1.4 : ACCELERATION) * delta;
      }
    } else if (keys.backward) {
      this.speed -= (this.speed > 0 ? BRAKING : ACCELERATION * 0.7) * delta;
    } else {
      if (Math.abs(this.speed) < FRICTION * delta) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(this.speed) * FRICTION * delta;
      }
    }

    this.speed = THREE.MathUtils.clamp(this.speed, MAX_REVERSE, currentMaxSpeed);

    // 4. TRAJECTOIRE
    if (this.isDrifting) {
      const relativeSteer = steerInput * this.driftDirection;
      const targetTurn =
        relativeSteer >= 0
          ? THREE.MathUtils.lerp(DRIFT_TURN_NEUTRAL, DRIFT_TURN_INWARD, relativeSteer)
          : THREE.MathUtils.lerp(DRIFT_TURN_NEUTRAL, DRIFT_TURN_OUTWARD, -relativeSteer);

      this.heading += this.driftDirection * targetTurn * this.driftEase * delta;
    } else if (Math.abs(this.speed) > 0.3) {
      const reverseFactor = this.speed >= 0 ? 1 : -1;
      this.heading += steerInput * TURN_SPEED * reverseFactor * delta;
    }

    this.mesh.rotation.y = this.heading;
    this.mesh.position.x += Math.sin(this.heading) * this.speed * delta;
    this.mesh.position.z += Math.cos(this.heading) * this.speed * delta;

    if (this.isDrifting) {
      const slideAmount = DRIFT_SLIDE_SPEED * this.driftEase * (this.speed / MAX_SPEED);
      this.mesh.position.x += -this.driftDirection * Math.cos(this.heading) * slideAmount * delta;
      this.mesh.position.z += this.driftDirection * Math.sin(this.heading) * slideAmount * delta;
    }

    // 5. COLLISION AVEC LES GLISSIÈRES EXTÉRIEURES
    const surfaceAfter = this.track.getSurfaceInfo(this.mesh.position);
    if (surfaceAfter.isOutOfBounds) {
      const pushDir = surfaceAfter.closestPoint.clone().sub(this.mesh.position).normalize();
      const overlap = surfaceAfter.distance - WALL_HALF_WIDTH;
      this.mesh.position.addScaledVector(pushDir, overlap);
      this.speed *= 0.94;
    }

    // 6. ANIMATIONS VISUELLES
    const targetDriftYaw = this.isDrifting ? this.driftDirection * 0.30 * this.driftEase : 0;
    this.visualGroup.rotation.y = THREE.MathUtils.lerp(
      this.visualGroup.rotation.y,
      targetDriftYaw,
      8 * delta
    );

    const leanDirection = this.isDrifting ? this.driftDirection : steerInput;
    this.chassis.rotation.z = THREE.MathUtils.lerp(
      this.chassis.rotation.z,
      -leanDirection * 0.13 * Math.min(this.speed / MAX_SPEED, 1),
      8 * delta
    );

    this.wheels[0].rotation.y = steerInput * 0.35;
    this.wheels[1].rotation.y = steerInput * 0.35;

    this.updateSparks(isBoosting, isStar);

    return surfaceAfter;
  }

  updateSparks(isBoosting, isStar) {
    if (isBoosting || isStar) {
      this.sparkMat.color.setHex(isStar ? 0x38bdf8 : 0xffdd00);
      this.sparkMat.opacity = 0.95;
      const pulse = 1.2 + Math.sin(performance.now() * 0.04) * 0.4;
      this.sparks.forEach((s) => s.scale.setScalar(pulse));
    } else if (this.isDrifting && this.driftLevel > 0) {
      this.sparkMat.color.setHex(this.driftLevel === 2 ? 0xff5500 : 0x00d2ff);
      this.sparkMat.opacity = 0.9;
      const pulse = (this.driftLevel === 2 ? 1.15 : 0.85) + Math.sin(performance.now() * 0.03) * 0.25;
      this.sparks.forEach((s) => s.scale.setScalar(pulse));
    } else {
      this.sparkMat.opacity = 0;
    }
  }

  getSpeedKmh() {
    return Math.round(Math.abs(this.speed) * 3.5);
  }
}