import * as THREE from 'three';
import { KART_CONFIG } from './config';

const ITEM_POOL = ['turbo', 'triple_turbo', 'missile', 'trap', 'star'];

export class ItemManager {
  constructor(scene, track, kart) {
    this.scene = scene;
    this.track = track;
    this.kart = kart;

    this.boostPads = [];
    this.itemBoxes = [];
    this.traps = [];
    this.projectiles = [];

    // [0] = Case principale (Actif), [1] = Case secondaire (Réserve)
    this.slots = [
      { status: 'empty', item: null, rollTimer: 0 },
      { status: 'empty', item: null, rollTimer: 0 },
    ];
    this.visualizedKey = 'empty';

    this.heldItemAnchor = new THREE.Group();
    this.heldItemAnchor.position.set(0, 0.75, -2.05);
    this.kart.mesh.add(this.heldItemAnchor);

    this.buildBoostPads();
    this.buildItemBoxes();
  }

  createTurboMesh(scale = 1) {
    const group = new THREE.Group();

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.34, 0.4, 14),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    stem.position.y = -0.15;
    group.add(stem);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
    );
    cap.position.y = -0.05;
    cap.castShadow = true;
    group.add(cap);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.07, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    group.add(ring);

    group.scale.setScalar(scale);
    return group;
  }

  createTripleTurboMesh() {
    const group = new THREE.Group();
    const offsets = [
      [0, 0.1, 0.25],
      [-0.45, -0.05, -0.2],
      [0.45, -0.05, -0.2],
    ];
    offsets.forEach(([x, y, z]) => {
      const mini = this.createTurboMesh(0.62);
      mini.position.set(x, y, z);
      group.add(mini);
    });
    return group;
  }

  createProjectileMesh() {
    const group = new THREE.Group();

    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.65, 0.42, 16),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3 })
    );
    shell.castShadow = true;
    group.add(shell);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.63, 0.08, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.12;
    group.add(rim);

    return group;
  }

  createTrapMesh() {
    const group = new THREE.Group();

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 0.9, 14),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 })
    );
    cone.castShadow = true;
    group.add(cone);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.54, 0.09, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.35;
    group.add(ring);

    return group;
  }

  createStarMesh() {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    group.add(core);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.07, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    group.add(halo);
    return group;
  }

  syncHeldItemVisual() {
    const primary = this.slots[0];
    const currentKey =
      primary.status === 'empty'
        ? 'empty'
        : primary.status === 'rolling'
        ? 'rolling'
        : primary.item;

    if (this.visualizedKey === currentKey) return;
    this.visualizedKey = currentKey;

    while (this.heldItemAnchor.children.length > 0) {
      this.heldItemAnchor.remove(this.heldItemAnchor.children[0]);
    }

    if (currentKey === 'empty') return;

    let mesh = null;
    if (currentKey === 'rolling') {
      mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.48),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true })
      );
    } else if (currentKey === 'turbo') {
      mesh = this.createTurboMesh(1);
    } else if (currentKey === 'triple_turbo') {
      mesh = this.createTripleTurboMesh();
    } else if (currentKey === 'missile') {
      mesh = this.createProjectileMesh();
    } else if (currentKey === 'trap') {
      mesh = this.createTrapMesh();
    } else if (currentKey === 'star') {
      mesh = this.createStarMesh();
    }

    if (mesh) {
      this.heldItemAnchor.add(mesh);
    }
  }

  buildBoostPads() {
    const padLocations = [
      { u: 0.13, offset: 0 },
      { u: 0.44, offset: -3.2 },
      { u: 0.84, offset: 2.5 },
    ];

    const padGeo = new THREE.PlaneGeometry(3.6, 5.4);
    const padMat = new THREE.MeshBasicMaterial({
      color: 0xff6b00,
      side: THREE.DoubleSide,
    });
    const stripeGeo = new THREE.PlaneGeometry(2.8, 1.0);
    const stripeMat = new THREE.MeshBasicMaterial({
      color: 0xffee00,
      side: THREE.DoubleSide,
    });

    padLocations.forEach(({ u, offset }) => {
      const pt = this.track.curve.getPointAt(u);
      const tan = this.track.curve.getTangentAt(u).normalize();
      const perp = new THREE.Vector3(-tan.z, 0, tan.x);
      const angle = Math.atan2(tan.x, tan.z);

      const pos = pt.clone().addScaledVector(perp, offset);
      pos.y = 0.04;

      const group = new THREE.Group();
      group.position.copy(pos);
      group.rotation.y = angle;

      const base = new THREE.Mesh(padGeo, padMat);
      base.rotation.x = -Math.PI / 2;
      group.add(base);

      [-1.3, 1.3].forEach((zOff) => {
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, 0.01, zOff);
        group.add(stripe);
      });

      this.scene.add(group);
      this.boostPads.push({ position: pos });
    });
  }

  buildItemBoxes() {
    // 3 rangées dont une dès la première ligne droite (0.06)
    const rowLocations = [0.06, 0.32, 0.66];
    const laneConfigs = [
      { offset: -5.4, isDouble: false },
      { offset: -1.8, isDouble: true },
      { offset: 1.8, isDouble: true },
      { offset: 5.4, isDouble: false },
    ];

    const outerGeo = new THREE.BoxGeometry(1.85, 1.85, 1.85);
    const innerGeo = new THREE.OctahedronGeometry(0.8);

    rowLocations.forEach((u) => {
      const pt = this.track.curve.getPointAt(u);
      const tan = this.track.curve.getTangentAt(u).normalize();
      const perp = new THREE.Vector3(-tan.z, 0, tan.x);

      laneConfigs.forEach(({ offset, isDouble }, idx) => {
        const pos = pt.clone().addScaledVector(perp, offset);
        pos.y = 1.3;

        const group = new THREE.Group();
        group.position.copy(pos);

        const outerMat = new THREE.MeshStandardMaterial({
          color: isDouble ? 0xf59e0b : idx % 2 === 0 ? 0x00d2ff : 0xff00aa,
          transparent: true,
          opacity: 0.72,
          roughness: 0.15,
        });

        const outerMesh = new THREE.Mesh(outerGeo, outerMat);
        group.add(outerMesh);

        let secondCube = null;
        if (isDouble) {
          secondCube = new THREE.Mesh(
            new THREE.BoxGeometry(1.65, 1.65, 1.65),
            new THREE.MeshBasicMaterial({
              color: 0xfef08a,
              wireframe: true,
            })
          );
          secondCube.rotation.set(Math.PI / 4, Math.PI / 4, 0);
          group.add(secondCube);
        }

        const innerMesh = new THREE.Mesh(
          innerGeo,
          new THREE.MeshBasicMaterial({ color: isDouble ? 0xffffff : 0xffee00 })
        );
        group.add(innerMesh);

        this.scene.add(group);
        this.itemBoxes.push({
          group,
          outerMesh,
          secondCube,
          innerMesh,
          isDouble,
          baseY: pos.y,
          respawnTimer: 0,
        });
      });
    });
  }

  triggerItemRoll(count = 1) {
    let granted = 0;

    if (this.slots[0].status === 'empty' && granted < count) {
      this.slots[0] = { status: 'rolling', item: null, rollTimer: 1.1 };
      granted++;
    }

    if (this.slots[1].status === 'empty' && granted < count) {
      const delay = granted > 0 ? 1.45 : 1.1;
      this.slots[1] = { status: 'rolling', item: null, rollTimer: delay };
      granted++;
    }
  }

  reset() {
    this.slots = [
      { status: 'empty', item: null, rollTimer: 0 },
      { status: 'empty', item: null, rollTimer: 0 },
    ];
    this.syncHeldItemVisual();

    this.itemBoxes.forEach((box) => {
      box.respawnTimer = 0;
      box.group.visible = true;
    });

    this.traps.forEach((t) => this.scene.remove(t.mesh));
    this.traps = [];

    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projectiles = [];
  }

  spawnTrap(kart) {
    const pos = kart.mesh.position.clone();
    pos.x -= Math.sin(kart.heading) * 2.4;
    pos.z -= Math.cos(kart.heading) * 2.4;
    pos.y = 0.45;

    const trapGroup = this.createTrapMesh();
    trapGroup.position.copy(pos);

    this.scene.add(trapGroup);
    this.traps.push({
      mesh: trapGroup,
      graceTimer: 0.35,
    });
  }

  spawnProjectile(kart) {
    const pos = kart.mesh.position.clone();
    pos.x += Math.sin(kart.heading) * 2.4;
    pos.z += Math.cos(kart.heading) * 2.4;
    pos.y = 0.55;

    const mesh = this.createProjectileMesh();
    mesh.position.copy(pos);
    this.scene.add(mesh);

    const velocity = new THREE.Vector3(
      Math.sin(kart.heading) * KART_CONFIG.PROJECTILE_SPEED,
      0,
      Math.cos(kart.heading) * KART_CONFIG.PROJECTILE_SPEED
    );

    this.projectiles.push({
      mesh,
      velocity,
      lifeTimer: 3.5,
    });
  }

  useHeldItem(kart) {
    const primary = this.slots[0];
    if (primary.status !== 'ready' || !primary.item) return;

    const itemToUse = primary.item;

    // Le second objet passe automatiquement dans la case principale
    this.slots[0] = { ...this.slots[1] };
    this.slots[1] = { status: 'empty', item: null, rollTimer: 0 };
    this.syncHeldItemVisual();

    if (itemToUse === 'turbo') {
      kart.triggerBoost(KART_CONFIG.BOOST_L2_DURATION);
    } else if (itemToUse === 'triple_turbo') {
      kart.triggerBoost(KART_CONFIG.TRIPLE_BOOST_DURATION);
    } else if (itemToUse === 'trap') {
      this.spawnTrap(kart);
    } else if (itemToUse === 'missile') {
      this.spawnProjectile(kart);
    } else if (itemToUse === 'star') {
      kart.triggerStar(KART_CONFIG.STAR_DURATION);
    }
  }

  getHudSlots() {
    return [
      { status: this.slots[0].status, item: this.slots[0].item },
      { status: this.slots[1].status, item: this.slots[1].item },
    ];
  }

  update(delta, kart, wantsToUseItem) {
    const now = performance.now() * 0.003;
    const kartPos = kart.mesh.position;
    const pickupRadiusSq = KART_CONFIG.ITEM_BOX_PICKUP_RADIUS ** 2;

    for (let i = 0; i < this.boostPads.length; i++) {
      const dx = kartPos.x - this.boostPads[i].position.x;
      const dz = kartPos.z - this.boostPads[i].position.z;
      if (dx * dx + dz * dz < 7.5) {
        kart.triggerBoost(KART_CONFIG.BOOST_PAD_DURATION);
      }
    }

    for (let i = 0; i < this.itemBoxes.length; i++) {
      const box = this.itemBoxes[i];
      if (box.respawnTimer > 0) {
        box.respawnTimer -= delta;
        if (box.respawnTimer <= 0) {
          box.respawnTimer = 0;
          box.group.visible = true;
        }
        continue;
      }

      box.outerMesh.rotation.y += 1.8 * delta;
      box.outerMesh.rotation.x += 1.1 * delta;
      if (box.secondCube) {
        box.secondCube.rotation.y -= 2.4 * delta;
      }
      box.innerMesh.rotation.y -= 3.0 * delta;
      box.group.position.y = box.baseY + Math.sin(now + i) * 0.2;

      const dx = kartPos.x - box.group.position.x;
      const dz = kartPos.z - box.group.position.z;
      if (dx * dx + dz * dz < pickupRadiusSq) {
        box.group.visible = false;
        box.respawnTimer = KART_CONFIG.ITEM_RESPAWN_TIME;
        this.triggerItemRoll(box.isDouble ? 2 : 1);
      }
    }

    for (let s = 0; s < this.slots.length; s++) {
      const slot = this.slots[s];
      if (slot.status === 'rolling') {
        slot.rollTimer -= delta;
        if (slot.rollTimer <= 0) {
          const randomIndex = Math.floor(Math.random() * ITEM_POOL.length);
          slot.status = 'ready';
          slot.item = ITEM_POOL[randomIndex];
          slot.rollTimer = 0;
        }
      }
    }

    this.syncHeldItemVisual();
    if (this.slots[0].status !== 'empty') {
      this.heldItemAnchor.position.y = 0.75 + Math.sin(now * 2.5) * 0.1;
      if (this.slots[0].item !== 'trap') {
        this.heldItemAnchor.rotation.y += 3.5 * delta;
      } else {
        this.heldItemAnchor.rotation.y = 0;
      }
    }

    if (wantsToUseItem) {
      this.useHeldItem(kart);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.lifeTimer -= delta;
      proj.mesh.rotation.y += 12 * delta;
      proj.mesh.position.addScaledVector(proj.velocity, delta);

      const surface = this.track.getSurfaceInfo(proj.mesh.position);
      if (surface.isOutOfBounds) {
        const normal = surface.closestPoint
          .clone()
          .sub(proj.mesh.position)
          .setY(0)
          .normalize();
        proj.velocity.reflect(normal);
        proj.mesh.position.addScaledVector(
          normal,
          surface.distance - KART_CONFIG.WALL_HALF_WIDTH + 0.4
        );
      }

      for (let j = this.traps.length - 1; j >= 0; j--) {
        const dx = proj.mesh.position.x - this.traps[j].mesh.position.x;
        const dz = proj.mesh.position.z - this.traps[j].mesh.position.z;
        if (dx * dx + dz * dz < 2.6) {
          this.scene.remove(this.traps[j].mesh);
          this.traps.splice(j, 1);
          proj.lifeTimer = 0;
          break;
        }
      }

      if (proj.lifeTimer <= 0) {
        this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.traps.length - 1; i >= 0; i--) {
      const trap = this.traps[i];
      if (trap.graceTimer > 0) {
        trap.graceTimer -= delta;
        continue;
      }

      const dx = kartPos.x - trap.mesh.position.x;
      const dz = kartPos.z - trap.mesh.position.z;
      if (dx * dx + dz * dz < 2.6) {
        this.scene.remove(trap.mesh);
        this.traps.splice(i, 1);
        kart.triggerSpinOut();
      }
    }
  }
}