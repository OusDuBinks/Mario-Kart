import * as THREE from 'three';
import { KART_CONFIG } from './config';

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.samples = [];

    this.buildCurve();
    this.buildEnvironment();
    this.buildRoadAndCurbs();
    this.buildFinishLine();
    this.buildBarriers();
  }

  buildCurve() {
    const points = [
      new THREE.Vector3(0, 0, 0),       // Ligne de départ / arrivée
      new THREE.Vector3(0, 0, 80),      // Fin de la ligne droite principale
      new THREE.Vector3(45, 0, 130),    // Grande courbe rapide à droite
      new THREE.Vector3(120, 0, 115),   // Sortie de courbe
      new THREE.Vector3(140, 0, 50),    // Entrée de chicane
      new THREE.Vector3(95, 0, 10),     // Virage intérieur serré
      new THREE.Vector3(145, 0, -45),   // Entrée de l'épingle
      new THREE.Vector3(115, 0, -110),  // Sommet de l'épingle
      new THREE.Vector3(45, 0, -100),   // Ligne droite arrière
      new THREE.Vector3(0, 0, -65),     // Dernier virage avant la ligne droite
    ];

    this.curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');

    const sampleCount = 360;
    for (let i = 0; i < sampleCount; i++) {
      const u = i / sampleCount;
      this.samples.push({
        u,
        point: this.curve.getPointAt(u),
        tangent: this.curve.getTangentAt(u).normalize(),
      });
    }
  }

  buildEnvironment() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshStandardMaterial({ color: 0x3b7a57, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  createRibbonMesh(innerOffset, outerOffset, yHeight, colorA, colorB, stripes = 160) {
    const positions = [];
    const colors = [];
    const indices = [];

    const cA = new THREE.Color(colorA);
    const cB = new THREE.Color(colorB);

    for (let i = 0; i <= stripes; i++) {
      const u = (i % stripes) / stripes;
      const pt = this.curve.getPointAt(u);
      const tan = this.curve.getTangentAt(u).normalize();
      const perp = new THREE.Vector3(-tan.z, 0, tan.x);

      const leftPt = pt.clone().addScaledVector(perp, innerOffset);
      const rightPt = pt.clone().addScaledVector(perp, outerOffset);

      positions.push(leftPt.x, yHeight, leftPt.z);
      positions.push(rightPt.x, yHeight, rightPt.z);

      const activeColor = i % 2 === 0 ? cA : cB;
      colors.push(activeColor.r, activeColor.g, activeColor.b);
      colors.push(activeColor.r, activeColor.g, activeColor.b);

      if (i < stripes) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.75,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  buildRoadAndCurbs() {
    const hw = KART_CONFIG.TRACK_HALF_WIDTH;
    const curbWidth = 1.1;

    this.createRibbonMesh(-hw, hw, 0.02, 0x2f3136, 0x34373c, 240);
    this.createRibbonMesh(-hw - curbWidth, -hw, 0.03, 0xe62e2e, 0xffffff, 180);
    this.createRibbonMesh(hw, hw + curbWidth, 0.03, 0xe62e2e, 0xffffff, 180);
  }

  buildFinishLine() {
    const startPt = this.curve.getPointAt(0);
    const startTan = this.curve.getTangentAt(0).normalize();
    const angle = Math.atan2(startTan.x, startTan.z);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const size = 16;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#111111';
        ctx.fillRect(x * size, y * size, size, size);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;

    const lineMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(KART_CONFIG.TRACK_HALF_WIDTH * 2, 3.2),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    lineMesh.rotation.x = -Math.PI / 2;
    lineMesh.rotation.z = -angle;
    lineMesh.position.set(startPt.x, 0.04, startPt.z);
    this.scene.add(lineMesh);

    const archGroup = new THREE.Group();
    archGroup.position.copy(startPt);
    archGroup.rotation.y = angle;

    const pillarGeo = new THREE.BoxGeometry(0.8, 7, 0.8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
    const hw = KART_CONFIG.TRACK_HALF_WIDTH + 1.2;

    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-hw, 3.5, 0);
    leftPillar.castShadow = true;
    archGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(hw, 3.5, 0);
    rightPillar.castShadow = true;
    archGroup.add(rightPillar);

    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(hw * 2 + 0.8, 1.4, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xe62e2e })
    );
    banner.position.set(0, 6.5, 0);
    banner.castShadow = true;
    archGroup.add(banner);

    this.scene.add(archGroup);
  }

  buildBarriers() {
    const wallDist = KART_CONFIG.WALL_HALF_WIDTH;
    const postCount = 110;
    const postGeo = new THREE.BoxGeometry(0.9, 1.4, 2.2);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xd92626 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5 });

    for (let i = 0; i < postCount; i++) {
      const u = i / postCount;
      const pt = this.curve.getPointAt(u);
      const tan = this.curve.getTangentAt(u).normalize();
      const perp = new THREE.Vector3(-tan.z, 0, tan.x);
      const angle = Math.atan2(tan.x, tan.z);
      const mat = i % 2 === 0 ? redMat : whiteMat;

      [-wallDist, wallDist].forEach((side) => {
        const post = new THREE.Mesh(postGeo, mat);
        post.position.copy(pt).addScaledVector(perp, side);
        post.position.y = 0.7;
        post.rotation.y = angle;
        post.castShadow = true;
        this.scene.add(post);
      });
    }
  }

  getStartTransform() {
    const point = this.curve.getPointAt(0);
    const tangent = this.curve.getTangentAt(0).normalize();
    return {
      position: point,
      heading: Math.atan2(tangent.x, tangent.z),
    };
  }

  getSurfaceInfo(position) {
    let closest = this.samples[0];
    let minDistSq = Infinity;

    for (let i = 0; i < this.samples.length; i++) {
      const dSq = position.distanceToSquared(this.samples[i].point);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closest = this.samples[i];
      }
    }

    const distance = Math.sqrt(minDistSq);
    return {
      u: closest.u,
      distance,
      closestPoint: closest.point,
      isOffRoad: distance > KART_CONFIG.TRACK_HALF_WIDTH,
      isOutOfBounds: distance > KART_CONFIG.WALL_HALF_WIDTH,
    };
  }
}