import * as THREE from 'three';
import { KART_CONFIG } from './config';

export class Kart {
  constructor(scene) {
    this.mesh = new THREE.Group();
    this.speed = 0;
    this.heading = 0;

    this.buildMesh();
    this.reset();
    scene.add(this.mesh);
  }

  buildMesh() {
    // Châssis
    this.chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.5, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xe62e2e })
    );
    this.chassis.position.y = 0.55;
    this.chassis.castShadow = true;
    this.mesh.add(this.chassis);

    // Pilote
    const driver = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xffcc00 })
    );
    driver.position.set(0, 1.1, -0.1);
    driver.castShadow = true;
    this.mesh.add(driver);

    // Roues
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
      this.mesh.add(wheel);
      return wheel;
    });
  }

  reset() {
    const { x, y, z } = KART_CONFIG.START_POS;
    this.mesh.position.set(x, y, z);
    this.speed = 0;
    this.heading = 0;
  }

  update(delta, keys) {
    const { MAX_SPEED, MAX_REVERSE, ACCELERATION, BRAKING, FRICTION, TURN_SPEED } = KART_CONFIG;

    // Accélération / Freinage
    if (keys.forward) {
      this.speed += ACCELERATION * delta;
    } else if (keys.backward) {
      this.speed -= (this.speed > 0 ? BRAKING : ACCELERATION * 0.7) * delta;
    } else {
      if (Math.abs(this.speed) < FRICTION * delta) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(this.speed) * FRICTION * delta;
      }
    }

    this.speed = THREE.MathUtils.clamp(this.speed, MAX_REVERSE, MAX_SPEED);

    // Direction
    let steerInput = 0;
    if (keys.left) steerInput += 1;
    if (keys.right) steerInput -= 1;

    if (Math.abs(this.speed) > 0.3) {
      const reverseFactor = this.speed >= 0 ? 1 : -1;
      this.heading += steerInput * TURN_SPEED * reverseFactor * delta;
    }

    // Application du mouvement
    this.mesh.rotation.y = this.heading;
    this.mesh.position.x += Math.sin(this.heading) * this.speed * delta;
    this.mesh.position.z += Math.cos(this.heading) * this.speed * delta;

    // Animations visuelles
    this.chassis.rotation.z = THREE.MathUtils.lerp(
      this.chassis.rotation.z,
      -steerInput * 0.12 * (this.speed / MAX_SPEED),
      10 * delta
    );
    this.wheels[0].rotation.y = steerInput * 0.35;
    this.wheels[1].rotation.y = steerInput * 0.35;
  }

  getSpeedKmh() {
    return Math.round(Math.abs(this.speed) * 3.5);
  }
}