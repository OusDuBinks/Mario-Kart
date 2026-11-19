import * as THREE from 'three';
import { InputManager } from './InputManager';
import { RaceTracker } from './RaceTracker';
import { Track } from '../world/Track';
import { Kart } from '../entities/Kart';
import { ItemManager } from '../items/ItemManager';

const _idealOffset = new THREE.Vector3();
const _idealCamPos = new THREE.Vector3();
const _idealLookAt = new THREE.Vector3();

export class Engine {
  constructor(container, onHudUpdate) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.lastTime = performance.now();
    this.animationFrameId = null;
    this.lastHudSync = 0;

    this.initScene();
    this.initLights();

    this.input = new InputManager();
    this.race = new RaceTracker();
    this.track = new Track(this.scene);
    this.kart = new Kart(this.scene, this.track);
    this.items = new ItemManager(this.scene, this.track, this.kart);

    this.resetRaceState();

    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  resetRaceState() {
    this.kart.reset();
    this.items.reset();
    this.race.reset();

    const start = this.track.getStartTransform();
    this.currentCamPos = start.position.clone().add(
      new THREE.Vector3(-Math.sin(start.heading) * 7.5, 3.6, -Math.cos(start.heading) * 7.5)
    );
    this.currentLookAt = start.position.clone().add(new THREE.Vector3(0, 1.2, 0));
  }

  initScene() {
    this.container.innerHTML = '';
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 280);

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 600);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }

  initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(60, 120, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    const d = 160;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);
  }

  updateCamera(delta) {
    const pos = this.kart.mesh.position;
    const heading = this.kart.heading;
    const isFast = this.kart.boostTimer > 0 || this.kart.bulletTimer > 0;

    const targetFov = isFast ? 78 : 65;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 8 * delta);
      this.camera.updateProjectionMatrix();
    }

    _idealOffset.set(-Math.sin(heading) * 7.5, 3.6, -Math.cos(heading) * 7.5);
    _idealCamPos.copy(pos).add(_idealOffset);
    this.currentCamPos.lerp(_idealCamPos, 1 - Math.exp(-8 * delta));
    this.camera.position.copy(this.currentCamPos);

    _idealLookAt.set(
      pos.x + Math.sin(heading) * 5,
      pos.y + 1.2,
      pos.z + Math.cos(heading) * 5
    );
    this.currentLookAt.lerp(_idealLookAt, 1 - Math.exp(-12 * delta));
    this.camera.lookAt(this.currentLookAt);
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.input.consumeReset()) {
      this.resetRaceState();
    }

    const surfaceInfo = this.kart.update(delta, this.input.keys);
    const raceState = this.race.getState();

    this.items.update(delta, this.kart, this.input.consumeUseItem(), {
      rank: raceState.rank || 1,
      totalRacers: raceState.totalRacers || 1,
    });

    this.race.update(
      delta,
      surfaceInfo,
      this.kart.heading,
      this.kart.speed,
      this.kart.spinOutTimer > 0
    );
    this.updateCamera(delta);

    if (now - this.lastHudSync > 50) {
      this.lastHudSync = now;
      this.onHudUpdate({
        speedKmh: this.kart.getSpeedKmh(),
        driftLevel: this.kart.driftLevel,
        isBoosting: this.kart.boostTimer > 0,
        isStarActive: this.kart.starTimer > 0,
        isBulletActive: this.kart.bulletTimer > 0,
        isOffRoad: this.kart.isOffRoad,
        itemSlots: this.items.getHudSlots(),
        ...this.race.getState(),
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    if (!this.container) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.input.dispose();
    this.kart.dispose();
    this.items.dispose();
    this.track.dispose();
    this.renderer.dispose();
    if (this.container && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}