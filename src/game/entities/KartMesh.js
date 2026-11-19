import * as THREE from 'three';

export class KartMesh {
  constructor() {
    this.root = new THREE.Group();
    this.visualGroup = new THREE.Group();
    this.root.add(this.visualGroup);
    this.disposables = [];

    this.buildParts();
    this.buildBulletSuit();
  }

  trackDisposable(res) {
    this.disposables.push(res);
    return res;
  }

  buildParts() {
    this.kartPartsGroup = new THREE.Group();
    this.visualGroup.add(this.kartPartsGroup);

    const chassisGeo = this.trackDisposable(new THREE.BoxGeometry(1.6, 0.5, 2.6));
    this.chassisMat = this.trackDisposable(new THREE.MeshStandardMaterial({ color: 0xe62e2e }));
    this.chassis = new THREE.Mesh(chassisGeo, this.chassisMat);
    this.chassis.position.y = 0.55;
    this.chassis.castShadow = true;
    this.kartPartsGroup.add(this.chassis);

    const driverGeo = this.trackDisposable(new THREE.BoxGeometry(0.7, 0.7, 0.7));
    const driverMat = this.trackDisposable(new THREE.MeshStandardMaterial({ color: 0xffcc00 }));
    const driver = new THREE.Mesh(driverGeo, driverMat);
    driver.position.set(0, 1.1, -0.1);
    driver.castShadow = true;
    this.kartPartsGroup.add(driver);

    const wheelGeo = this.trackDisposable(new THREE.CylinderGeometry(0.4, 0.4, 0.35, 16));
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = this.trackDisposable(new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));

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
      this.kartPartsGroup.add(wheel);
      return wheel;
    });

    const sparkGeo = this.trackDisposable(new THREE.SphereGeometry(0.32, 8, 8));
    this.sparkMat = this.trackDisposable(
      new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0 })
    );

    this.sparks = [-1.05, 1.05].map((x) => {
      const spark = new THREE.Mesh(sparkGeo, this.sparkMat);
      spark.position.set(x, 0.35, -1.25);
      this.kartPartsGroup.add(spark);
      return spark;
    });
  }

  buildBulletSuit() {
    this.bulletGroup = new THREE.Group();
    this.bulletGroup.visible = false;

    const bodyGeo = this.trackDisposable(new THREE.CylinderGeometry(0.85, 0.85, 2.5, 18));
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.25 })
    );
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.95, -0.2);
    body.castShadow = true;

    const noseGeo = this.trackDisposable(new THREE.ConeGeometry(0.85, 1.3, 18));
    noseGeo.rotateX(Math.PI / 2);
    const noseMat = this.trackDisposable(
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
    );
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.95, 1.7);

    const flameGeo = this.trackDisposable(new THREE.ConeGeometry(0.65, 1.8, 12));
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = this.trackDisposable(new THREE.MeshBasicMaterial({ color: 0xff6b00 }));
    this.bulletFlame = new THREE.Mesh(flameGeo, flameMat);
    this.bulletFlame.position.set(0, 0.95, -2.2);

    this.bulletGroup.add(body, nose, this.bulletFlame);
    this.visualGroup.add(this.bulletGroup);
  }

  reset() {
    this.kartPartsGroup.visible = true;
    this.bulletGroup.visible = false;
    this.chassisMat.color.setHex(0xe62e2e);
    this.visualGroup.position.set(0, 0, 0);
    this.visualGroup.rotation.set(0, 0, 0);
    this.chassis.rotation.set(0, 0, 0);
    this.sparkMat.opacity = 0;
  }

  updateVisuals(delta, {
    hopHeight,
    isDrifting,
    driftDirection,
    driftEase,
    driftLevel,
    steerInput,
    speedRatio,
    isBoosting,
    isStar,
    isBullet,
  }) {
    this.kartPartsGroup.visible = !isBullet;
    this.bulletGroup.visible = isBullet;

    if (isBullet) {
      this.visualGroup.position.y = 0.25 + Math.sin(performance.now() * 0.03) * 0.08;
      this.visualGroup.rotation.set(0, 0, 0);
      this.bulletFlame.scale.setScalar(0.9 + Math.sin(performance.now() * 0.06) * 0.25);
      return;
    }

    this.visualGroup.position.y = hopHeight;

    if (isStar) {
      this.chassisMat.color.setHSL((performance.now() * 0.0025) % 1, 0.9, 0.52);
    } else {
      this.chassisMat.color.setHex(0xe62e2e);
    }

    const targetDriftYaw = isDrifting ? driftDirection * 0.3 * driftEase : 0;
    this.visualGroup.rotation.y = THREE.MathUtils.lerp(
      this.visualGroup.rotation.y,
      targetDriftYaw,
      8 * delta
    );

    const leanDirection = isDrifting ? driftDirection : steerInput;
    this.chassis.rotation.z = THREE.MathUtils.lerp(
      this.chassis.rotation.z,
      -leanDirection * 0.13 * speedRatio,
      8 * delta
    );

    this.wheels[0].rotation.y = steerInput * 0.35;
    this.wheels[1].rotation.y = steerInput * 0.35;

    this.updateSparks(isBoosting, isStar, isDrifting, driftLevel);
  }

  updateSparks(isBoosting, isStar, isDrifting, driftLevel) {
    if (isBoosting || isStar) {
      this.sparkMat.color.setHex(isStar ? 0x38bdf8 : 0xffdd00);
      this.sparkMat.opacity = 0.95;
      const pulse = 1.2 + Math.sin(performance.now() * 0.04) * 0.4;
      this.sparks.forEach((s) => s.scale.setScalar(pulse));
    } else if (isDrifting && driftLevel > 0) {
      this.sparkMat.color.setHex(driftLevel === 2 ? 0xff5500 : 0x00d2ff);
      this.sparkMat.opacity = 0.9;
      const pulse = (driftLevel === 2 ? 1.15 : 0.85) + Math.sin(performance.now() * 0.03) * 0.25;
      this.sparks.forEach((s) => s.scale.setScalar(pulse));
    } else {
      this.sparkMat.opacity = 0;
    }
  }

  dispose() {
    this.disposables.forEach((res) => res.dispose());
    this.disposables = [];
  }
}