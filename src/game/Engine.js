import * as THREE from 'three';
import { KART_CONFIG } from './config';
import { InputManager } from './InputManager';
import { Track } from './Track';
import { Kart } from './Kart';
import { ItemManager } from './ItemManager';

export class Engine {
  constructor(container, onHudUpdate) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.lastTime = performance.now();
    this.animationFrameId = null;

    this.initScene();
    this.initLights();

    this.input = new InputManager();
    this.track = new Track(this.scene);
    this.kart = new Kart(this.scene, this.track);
    this.items = new ItemManager(this.scene, this.track, this.kart);

    this.resetRaceState();
    this.lastHudSync = 0;

    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  resetRaceState() {
    this.kart.reset();
    if (this.items) {
      this.items.reset();
    }
    this.lap = 1;
    this.checkpoints = { cp1: false, cp2: false, cp3: false };
    this.raceTime = 0;
    this.currentLapTime = 0;
    this.bestLapTime = null;
    this.lapBanner = null;
    this.lapBannerTimer = 0;
    this.isFinished = false;

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

    this.camera = new THREE.PerspectiveCamera(
      65,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      600
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
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

  updateLapProgress(u) {
    if (this.isFinished) return;

    // Validation séquentielle des 3 secteurs du circuit
    if (u >= 0.18 && u <= 0.40) {
      this.checkpoints.cp1 = true;
    } else if (this.checkpoints.cp1 && u >= 0.42 && u <= 0.68) {
      this.checkpoints.cp2 = true;
    } else if (this.checkpoints.cp2 && u >= 0.70 && u <= 0.92) {
      this.checkpoints.cp3 = true;
    }

    // Franchissement de la ligne d'arrivée
    if (this.checkpoints.cp1 && this.checkpoints.cp2 && this.checkpoints.cp3 && u < 0.14) {
      this.checkpoints = { cp1: false, cp2: false, cp3: false };

      if (this.bestLapTime === null || this.currentLapTime < this.bestLapTime) {
        this.bestLapTime = this.currentLapTime;
      }
      this.currentLapTime = 0;

      if (this.lap >= KART_CONFIG.TOTAL_LAPS) {
        this.isFinished = true;
        this.lapBanner = null;
      } else {
        this.lap += 1;
        this.lapBanner =
          this.lap === KART_CONFIG.TOTAL_LAPS
            ? 'DERNIER TOUR !'
            : `TOUR ${this.lap} / ${KART_CONFIG.TOTAL_LAPS}`;
        this.lapBannerTimer = 2.4;
      }
    }
  }

  updateCamera(delta) {
    const pos = this.kart.mesh.position;
    const heading = this.kart.heading;
    const isBoosting = this.kart.boostTimer > 0;

    const targetFov = isBoosting ? 78 : 65;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 8 * delta);
      this.camera.updateProjectionMatrix();
    }

    const idealOffset = new THREE.Vector3(
      -Math.sin(heading) * 7.5,
      3.6,
      -Math.cos(heading) * 7.5
    );
    const idealCamPos = pos.clone().add(idealOffset);
    this.currentCamPos.lerp(idealCamPos, 1 - Math.exp(-8 * delta));
    this.camera.position.copy(this.currentCamPos);

    const idealLookAt = new THREE.Vector3(
      pos.x + Math.sin(heading) * 5,
      pos.y + 1.2,
      pos.z + Math.cos(heading) * 5
    );
    this.currentLookAt.lerp(idealLookAt, 1 - Math.exp(-12 * delta));
    this.camera.lookAt(this.currentLookAt);
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (this.input.consumeReset()) {
      this.resetRaceState();
    }

    if (!this.isFinished) {
      this.raceTime += delta;
      this.currentLapTime += delta;
    }

    if (this.lapBannerTimer > 0) {
      this.lapBannerTimer -= delta;
      if (this.lapBannerTimer <= 0) {
        this.lapBanner = null;
      }
    }

    const surfaceInfo = this.kart.update(delta, this.input.keys);
    this.items.update(delta, this.kart, this.input.consumeUseItem());
    this.updateLapProgress(surfaceInfo.u);
    this.updateCamera(delta);

    if (now - this.lastHudSync > 50) {
      this.lastHudSync = now;
      this.onHudUpdate({
        speedKmh: this.kart.getSpeedKmh(),
        driftLevel: this.kart.driftLevel,
        isBoosting: this.kart.boostTimer > 0,
        isStarActive: this.kart.starTimer > 0,
        isOffRoad: this.kart.isOffRoad,
        itemSlots: this.items.getHudSlots(),
        lap: this.lap,
        totalLaps: KART_CONFIG.TOTAL_LAPS,
        raceTime: this.raceTime,
        currentLapTime: this.currentLapTime,
        bestLapTime: this.bestLapTime,
        lapBanner: this.lapBanner,
        isFinished: this.isFinished,
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  handleResize() {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.input.dispose();
    this.renderer.dispose();
    if (this.container && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}