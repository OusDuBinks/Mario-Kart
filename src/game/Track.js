import * as THREE from 'three';

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.buildEnvironment();
    this.buildTrack();
  }

  buildEnvironment() {
    // Sol en herbe
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: 0x3b7a57 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grille de repère spatial
    const grid = new THREE.GridHelper(600, 60, 0x000000, 0x000000);
    grid.position.y = 0.01;
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    this.scene.add(grid);
  }

  buildTrack() {
    // Piste en asphalte
    const track = new THREE.Mesh(
      new THREE.RingGeometry(35, 55, 64),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.02;
    track.receiveShadow = true;
    this.scene.add(track);

    // Bordures (plots)
    const pylonGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xff3333 : 0xffffff,
      });

      const innerPylon = new THREE.Mesh(pylonGeo, mat);
      innerPylon.position.set(Math.cos(angle) * 34, 0.75, Math.sin(angle) * 34);
      innerPylon.castShadow = true;
      this.scene.add(innerPylon);

      const outerPylon = new THREE.Mesh(pylonGeo, mat);
      outerPylon.position.set(Math.cos(angle) * 56, 0.75, Math.sin(angle) * 56);
      outerPylon.castShadow = true;
      this.scene.add(outerPylon);
    }
  }
}