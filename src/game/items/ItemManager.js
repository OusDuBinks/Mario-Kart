import * as THREE from 'three';
import { KART_CONFIG } from '../config';
import { ItemMeshFactory } from './ItemMeshFactory';
import { Inventory } from './Inventory';

const _wallNormal = new THREE.Vector3();

export class ItemManager {
  constructor(scene, track, kart) {
    this.scene = scene;
    this.track = track;
    this.kart = kart;

    this.factory = new ItemMeshFactory();
    this.inventory = new Inventory();

    this.boostPads = [];
    this.itemBoxes = [];
    this.traps = [];
    this.projectiles = [];
    this.visualizedKey = 'empty';

    this.heldItemAnchor = new THREE.Group();
    this.heldItemAnchor.position.set(0, 0.75, -2.05);
    this.kart.mesh.add(this.heldItemAnchor);

    this.buildBoostPads();
    this.buildItemBoxes();
  }

  syncHeldItemVisual() {
    const currentKey = this.inventory.getPrimaryVisualKey();
    if (this.visualizedKey === currentKey) return;
    this.visualizedKey = currentKey;

    this.heldItemAnchor.clear();
    const mesh = this.factory.createByKey(currentKey);
    if (mesh) this.heldItemAnchor.add(mesh);
  }

  buildBoostPads() {
    const padLocations = [
      { u: 0.13, offset: 0 },
      { u: 0.44, offset: -3.2 },
      { u: 0.84, offset: 2.5 },
    ];

    padLocations.forEach(({ u, offset }) => {
      const pt = this.track.curve.getPointAt(u);
      const tan = this.track.curve.getTangentAt(u).normalize();
      const perp = new THREE.Vector3(-tan.z, 0, tan.x);

      const pos = pt.clone().addScaledVector(perp, offset);
      pos.y = 0.04;

      const group = this.factory.createBoostPad();
      group.position.copy(pos);
      group.rotation.y = Math.atan2(tan.x, tan.z);

      this.scene.add(group);
      this.boostPads.push({ position: pos });
    });
  }

  buildItemBoxes() {
    const rowLocations = [0.06, 0.32, 0.66];
    const laneConfigs = [
      { offset: -5.4, isDouble: false },
      { offset: -1.8, isDouble: true },
      { offset: 1.8, isDouble: true },
      { offset: 5.4, isDouble: false },
    ];

    rowLocations.forEach((u) => {
      const pt = this.track.curve.getPointAt(u);
      const tan = this.track.curve.getTangentAt(u).normalize();
      const perp = new THREE.Vector3(-tan.z, 0, tan.x);

      laneConfigs.forEach(({ offset, isDouble }, idx) => {
        const pos = pt.clone().addScaledVector(perp, offset);
        pos.y = 1.3;

        const parts = this.factory.createItemBox(isDouble, idx);
        parts.group.position.copy(pos);
        this.scene.add(parts.group);

        this.itemBoxes.push({
          ...parts,
          isDouble,
          baseY: pos.y,
          respawnTimer: 0,
        });
      });
    });
  }

  reset() {
    this.inventory.reset();
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
    const mesh = this.factory.createTrap();
    mesh.position.set(
      kart.mesh.position.x - Math.sin(kart.heading) * 2.4,
      0.45,
      kart.mesh.position.z - Math.cos(kart.heading) * 2.4
    );
    this.scene.add(mesh);
    this.traps.push({ mesh, graceTimer: 0.35 });
  }

  spawnProjectile(kart) {
    const mesh = this.factory.createProjectile();
    mesh.position.set(
      kart.mesh.position.x + Math.sin(kart.heading) * 2.5,
      0.55,
      kart.mesh.position.z + Math.cos(kart.heading) * 2.5
    );
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      velocity: new THREE.Vector3(
        Math.sin(kart.heading) * KART_CONFIG.PROJECTILE_SPEED,
        0,
        Math.cos(kart.heading) * KART_CONFIG.PROJECTILE_SPEED
      ),
      sampleIndex: kart.lastSampleIndex,
      bounces: 0,
      graceTimer: 0.3,
      lifeTimer: KART_CONFIG.PROJECTILE_LIFE,
    });
  }

  usePrimaryItem(kart) {
    const item = this.inventory.consumePrimary();
    if (!item) return;

    this.syncHeldItemVisual();

    if (item === 'turbo') kart.triggerBoost(KART_CONFIG.BOOST_L2_DURATION);
    else if (item === 'triple_turbo') kart.triggerBoost(KART_CONFIG.TRIPLE_BOOST_DURATION);
    else if (item === 'trap') this.spawnTrap(kart);
    else if (item === 'missile') this.spawnProjectile(kart);
    else if (item === 'star') kart.triggerStar(KART_CONFIG.STAR_DURATION);
    else if (item === 'bullet') kart.triggerBullet(KART_CONFIG.BULLET_DURATION);
  }

  getHudSlots() {
    return this.inventory.getSnapshot();
  }

  update(delta, kart, wantsToUseItem, raceContext = { rank: 1, totalRacers: 1 }) {
    const now = performance.now() * 0.003;
    const kartPos = kart.mesh.position;
    const pickupRadiusSq = KART_CONFIG.ITEM_BOX_PICKUP_RADIUS ** 2;

    // 1. Dalles Turbo
    for (let i = 0; i < this.boostPads.length; i++) {
      const dx = kartPos.x - this.boostPads[i].position.x;
      const dz = kartPos.z - this.boostPads[i].position.z;
      if (dx * dx + dz * dz < 7.5) {
        kart.triggerBoost(KART_CONFIG.BOOST_PAD_DURATION);
      }
    }

    // 2. Caisses à objets
    for (let i = 0; i < this.itemBoxes.length; i++) {
      const box = this.itemBoxes[i];
      if (box.respawnTimer > 0) {
        box.respawnTimer = Math.max(0, box.respawnTimer - delta);
        if (box.respawnTimer === 0) box.group.visible = true;
        continue;
      }

      box.outerMesh.rotation.y += 1.8 * delta;
      box.outerMesh.rotation.x += 1.1 * delta;
      if (box.secondCube) box.secondCube.rotation.y -= 2.4 * delta;
      box.innerMesh.rotation.y -= 3.0 * delta;
      box.group.position.y = box.baseY + Math.sin(now + i) * 0.2;

      const dx = kartPos.x - box.group.position.x;
      const dz = kartPos.z - box.group.position.z;
      if (dx * dx + dz * dz < pickupRadiusSq) {
        box.group.visible = false;
        box.respawnTimer = KART_CONFIG.ITEM_RESPAWN_TIME;
        this.inventory.triggerRoll(
          box.isDouble ? 2 : 1,
          raceContext.rank,
          raceContext.totalRacers
        );
      }
    }

    // 3. Roulette d'inventaire & visuel 3D
    this.inventory.update(delta);
    this.syncHeldItemVisual();

    if (this.visualizedKey !== 'empty' && kart.bulletTimer <= 0) {
      this.heldItemAnchor.visible = true;
      this.heldItemAnchor.position.y = 0.75 + Math.sin(now * 2.5) * 0.1;
      this.heldItemAnchor.rotation.y =
        this.visualizedKey === 'trap' ? 0 : this.heldItemAnchor.rotation.y + 3.5 * delta;
    } else {
      this.heldItemAnchor.visible = false;
    }

    if (wantsToUseItem) {
      this.usePrimaryItem(kart);
    }

    // 4. Projectiles (ricochets lisses le long de la courbe)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.lifeTimer -= delta;
      if (proj.graceTimer > 0) proj.graceTimer -= delta;

      proj.mesh.rotation.y += 12 * delta;
      proj.mesh.position.addScaledVector(proj.velocity, delta);

      const surface = this.track.getSurfaceInfo(proj.mesh.position, proj.sampleIndex);
      proj.sampleIndex = surface.sampleIndex;

      if (surface.isOutOfBounds) {
        _wallNormal.subVectors(surface.closestPoint, proj.mesh.position).setY(0).normalize();

        const penetration = surface.distance - KART_CONFIG.WALL_HALF_WIDTH + 0.35;
        if (penetration > 0) {
          proj.mesh.position.addScaledVector(_wallNormal, penetration);
        }

        if (proj.velocity.dot(_wallNormal) < 0) {
          proj.velocity.reflect(_wallNormal);
          proj.bounces += 1;
          if (proj.bounces > KART_CONFIG.PROJECTILE_MAX_BOUNCES) {
            proj.lifeTimer = 0;
          }
        }
      }

      // Collision obus <-> pièges
      for (let j = this.traps.length - 1; j >= 0; j--) {
        const dx = proj.mesh.position.x - this.traps[j].mesh.position.x;
        const dz = proj.mesh.position.z - this.traps[j].mesh.position.z;
        if (dx * dx + dz * dz < 3.2) {
          this.scene.remove(this.traps[j].mesh);
          this.traps.splice(j, 1);
          proj.lifeTimer = 0;
          break;
        }
      }

      // Collision obus <-> kart
      if (proj.lifeTimer > 0 && proj.graceTimer <= 0) {
        const kdx = proj.mesh.position.x - kartPos.x;
        const kdz = proj.mesh.position.z - kartPos.z;
        if (kdx * kdx + kdz * kdz < 3.6) {
          proj.lifeTimer = 0;
          kart.triggerSpinOut();
        }
      }

      if (proj.lifeTimer <= 0) {
        this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 5. Pièges au sol
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const trap = this.traps[i];
      if (trap.graceTimer > 0) {
        trap.graceTimer -= delta;
        continue;
      }

      const dx = kartPos.x - trap.mesh.position.x;
      const dz = kartPos.z - trap.mesh.position.z;
      if (dx * dx + dz * dz < 4.5) {
        this.scene.remove(trap.mesh);
        this.traps.splice(i, 1);
        kart.triggerSpinOut();
      }
    }
  }

  dispose() {
    this.reset();
    this.factory.dispose();
  }
}