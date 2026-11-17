import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Track } from './Track';
import { Kart } from './Kart';

export class Engine {
  constructor(container, onHudUpdate) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.clock = new THREE.Clock();
    this.lastDisplayedSpeed = -1;
    this.animationFrameId = null;

    this.initScene();
    this.initLights();

    this.input = new InputManager();
    this.track = new Track(this.scene);
    this.kart = new Kart(this.scene);

    this.currentCamPos = new THREE.Vector3(45, 6, -10);
    this.currentLookAt = new THREE.Vector3(45, 1, 0);

    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  initScene() {
    this.container.innerHTML = '';
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 60, 220);

    this.camera = new THREE.PerspectiveCamera(
      65,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      500
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
    dirLight.position.set(40, 80, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    const d = 80;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);
  }

  updateCamera(delta) {
    const pos = this.kart.mesh.position;
    const heading = this.kart.heading;

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
    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.input.consumeReset()) {
      this.kart.reset();
    }

    this.kart.update(delta, this.input.keys);
    this.updateCamera(delta);

    const speedKmh = this.kart.getSpeedKmh();
    if (speedKmh !== this.lastDisplayedSpeed) {
      this.lastDisplayedSpeed = speedKmh;
      this.onHudUpdate({ speedKmh });
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