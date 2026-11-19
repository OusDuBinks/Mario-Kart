import * as THREE from 'three';

// Fabrique avec cache partagé de géométries et matériaux pour éviter les fuites GPU
export class ItemMeshFactory {
  constructor() {
    this.geo = {
      stem: new THREE.CylinderGeometry(0.28, 0.34, 0.4, 14),
      cap: new THREE.SphereGeometry(0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      turboRing: new THREE.TorusGeometry(0.45, 0.07, 8, 16),
      shell: new THREE.CylinderGeometry(0.62, 0.65, 0.42, 16),
      shellRim: new THREE.TorusGeometry(0.63, 0.08, 8, 16),
      cone: new THREE.ConeGeometry(0.62, 0.9, 14),
      coneRing: new THREE.TorusGeometry(0.54, 0.09, 8, 16),
      starCore: new THREE.OctahedronGeometry(0.55, 0),
      starHalo: new THREE.TorusGeometry(0.62, 0.07, 8, 16),
      rolling: new THREE.OctahedronGeometry(0.48),
      boxOuter: new THREE.BoxGeometry(1.85, 1.85, 1.85),
      boxSecond: new THREE.BoxGeometry(1.65, 1.65, 1.65),
      boxInner: new THREE.OctahedronGeometry(0.8),
      padBase: new THREE.PlaneGeometry(3.6, 5.4),
      padStripe: new THREE.PlaneGeometry(2.8, 1.0),
      bulletBody: new THREE.CylinderGeometry(0.32, 0.32, 0.85, 14),
      bulletNose: new THREE.ConeGeometry(0.32, 0.45, 14)
    };

    this.mat = {
      whiteStd: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
      redCap: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }),
      goldBasic: new THREE.MeshBasicMaterial({ color: 0xfacc15 }),
      greenShell: new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 }),
      yellowCone: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }),
      redBasic: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
      starCore: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
      starHalo: new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
      rollingWire: new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true }),
      boxDouble: new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.72, roughness: 0.15 }),
      boxCyan: new THREE.MeshStandardMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.72, roughness: 0.15 }),
      boxMagenta: new THREE.MeshStandardMaterial({ color: 0xff00aa, transparent: true, opacity: 0.72, roughness: 0.15 }),
      boxWire: new THREE.MeshBasicMaterial({ color: 0xfef08a, wireframe: true }),
      innerWhite: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      innerYellow: new THREE.MeshBasicMaterial({ color: 0xffee00 }),
      padOrange: new THREE.MeshBasicMaterial({ color: 0xff6b00, side: THREE.DoubleSide }),
      padYellow: new THREE.MeshBasicMaterial({ color: 0xffee00, side: THREE.DoubleSide }),
    };
  }

  createTurbo(scale = 1) {
    const group = new THREE.Group();
    const stem = new THREE.Mesh(this.geo.stem, this.mat.whiteStd);
    stem.position.y = -0.15;

    const cap = new THREE.Mesh(this.geo.cap, this.mat.redCap);
    cap.position.y = -0.05;
    cap.castShadow = true;

    const ring = new THREE.Mesh(this.geo.turboRing, this.mat.goldBasic);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;

    group.add(stem, cap, ring);
    group.scale.setScalar(scale);
    return group;
  }

  createTripleTurbo() {
    const group = new THREE.Group();
    [
      [0, 0.1, 0.25],
      [-0.45, -0.05, -0.2],
      [0.45, -0.05, -0.2],
    ].forEach(([x, y, z]) => {
      const mini = this.createTurbo(0.62);
      mini.position.set(x, y, z);
      group.add(mini);
    });
    return group;
  }

  createProjectile() {
    const group = new THREE.Group();
    const shell = new THREE.Mesh(this.geo.shell, this.mat.greenShell);
    shell.castShadow = true;

    const rim = new THREE.Mesh(this.geo.shellRim, this.mat.whiteStd);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.12;

    group.add(shell, rim);
    return group;
  }

  createTrap() {
    const group = new THREE.Group();
    const cone = new THREE.Mesh(this.geo.cone, this.mat.yellowCone);
    cone.castShadow = true;

    const ring = new THREE.Mesh(this.geo.coneRing, this.mat.redBasic);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.35;

    group.add(cone, ring);
    return group;
  }

  createStar() {
    const group = new THREE.Group();
    group.add(
      new THREE.Mesh(this.geo.starCore, this.mat.starCore),
      new THREE.Mesh(this.geo.starHalo, this.mat.starHalo)
    );
    return group;
  }
  createBullet() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      this.geo.bulletBody,
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })
    );
    body.rotation.x = Math.PI / 2;

    const nose = new THREE.Mesh(this.geo.bulletNose, this.mat.redCap);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.65;

    group.add(body, nose);
    return group;
  }

  createByKey(key) {
    switch (key) {
      case 'rolling':
        return new THREE.Mesh(this.geo.rolling, this.mat.rollingWire);
      case 'turbo':
        return this.createTurbo(1);
      case 'triple_turbo':
        return this.createTripleTurbo();
      case 'missile':
        return this.createProjectile();
      case 'trap':
        return this.createTrap();
      case 'star':
        return this.createStar();
      case 'bullet': 
        return this.createBullet();
      default:
        return null;
    }
  }

  createBoostPad() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(this.geo.padBase, this.mat.padOrange);
    base.rotation.x = -Math.PI / 2;
    group.add(base);

    [-1.3, 1.3].forEach((zOff) => {
      const stripe = new THREE.Mesh(this.geo.padStripe, this.mat.padYellow);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, 0.01, zOff);
      group.add(stripe);
    });
    return group;
  }

  createItemBox(isDouble, variantIndex) {
    const group = new THREE.Group();
    const outerMat = isDouble
      ? this.mat.boxDouble
      : variantIndex % 2 === 0
      ? this.mat.boxCyan
      : this.mat.boxMagenta;

    const outerMesh = new THREE.Mesh(this.geo.boxOuter, outerMat);
    group.add(outerMesh);

    let secondCube = null;
    if (isDouble) {
      secondCube = new THREE.Mesh(this.geo.boxSecond, this.mat.boxWire);
      secondCube.rotation.set(Math.PI / 4, Math.PI / 4, 0);
      group.add(secondCube);
    }

    const innerMesh = new THREE.Mesh(
      this.geo.boxInner,
      isDouble ? this.mat.innerWhite : this.mat.innerYellow
    );
    group.add(innerMesh);

    return { group, outerMesh, secondCube, innerMesh };
  }

  dispose() {
    Object.values(this.geo).forEach((g) => g.dispose());
    Object.values(this.mat).forEach((m) => m.dispose());
  }
}