import * as THREE from 'three';
import { KART_CONFIG } from '../config';

const _toPos = new THREE.Vector3();

export class Track {
  constructor(scene) {
    this.scene = scene;
    this.samples = [];
    this.disposables = [];

    this.buildCurve();
    this.buildEnvironment();
    this.buildRoadAndCurbs();
    this.buildFinishLine();
    this.buildBarriers();
  }

  registerDisposable(resource) {
    this.disposables.push(resource);
    return resource;
  }

  buildCurve() {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 80),
      new THREE.Vector3(45, 0, 130),
      new THREE.Vector3(120, 0, 115),
      new THREE.Vector3(140, 0, 50),
      new THREE.Vector3(95, 0, 10),
      new THREE.Vector3(145, 0, -45),
      new THREE.Vector3(115, 0, -110),
      new THREE.Vector3(45, 0, -100),
      new THREE.Vector3(0, 0, -65),
    ];

    this.curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');

    const sampleCount = 360;
    for (let i = 0; i < sampleCount; i++) {
      const u = i / sampleCount;
      this.samples.push({
        index: i,
        u,
        point: this.curve.getPointAt(u),
        tangent: this.curve.getTangentAt(u).normalize(),
      });
    }
  }

  buildEnvironment() {
    const geo = this.registerDisposable(new THREE.PlaneGeometry(800, 800));
    const mat = this.registerDisposable(
      new THREE.MeshStandardMaterial({ color: 0x3b7a57, roughness: 0.9 })
    );
    const ground = new THREE.Mesh(geo, mat);
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
    const perp = new THREE.Vector3();
    const leftPt = new THREE.Vector3();
    const rightPt = new THREE.Vector3();

    for (let i = 0; i <= stripes; i++) {
      const u = (i % stripes) / stripes;
      const pt = this.curve.getPointAt(u);
      const tan = this.curve.getTangentAt(u).normalize();
      perp.set(-tan.z, 0, tan.x);

      leftPt.copy(pt).addScaledVector(perp, innerOffset);
      rightPt.copy(pt).addScaledVector(perp, outerOffset);

      positions.push(leftPt.x, yHeight, leftPt.z, rightPt.x, yHeight, rightPt.z);

      const activeColor = i % 2 === 0 ? cA : cB;
      colors.push(
        activeColor.r, activeColor.g, activeColor.b,
        activeColor.r, activeColor.g, activeColor.b
      );

      if (i < stripes) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const geometry = this.registerDisposable(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = this.registerDisposable(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 })
    );

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
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

    const texture = this.registerDisposable(new THREE.CanvasTexture(canvas));
    texture.magFilter = THREE.NearestFilter;

    const lineGeo = this.registerDisposable(
      new THREE.PlaneGeometry(KART_CONFIG.TRACK_HALF_WIDTH * 2, 3.2)
    );
    const lineMat = this.registerDisposable(new THREE.MeshBasicMaterial({ map: texture }));

    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
    lineMesh.rotation.x = -Math.PI / 2;
    lineMesh.rotation.z = -angle;
    lineMesh.position.set(startPt.x, 0.04, startPt.z);
    this.scene.add(lineMesh);

    const archGroup = new THREE.Group();
    archGroup.position.copy(startPt);
    archGroup.rotation.y = angle;

    const pillarGeo = this.registerDisposable(new THREE.BoxGeometry(0.8, 7, 0.8));
    const pillarMat = this.registerDisposable(new THREE.MeshStandardMaterial({ color: 0xdddddd }));
    const hw = KART_CONFIG.TRACK_HALF_WIDTH + 1.2;

    [-hw, hw].forEach((x) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 3.5, 0);
      pillar.castShadow = true;
      archGroup.add(pillar);
    });

    const bannerGeo = this.registerDisposable(new THREE.BoxGeometry(hw * 2 + 0.8, 1.4, 0.9));
    const bannerMat = this.registerDisposable(new THREE.MeshStandardMaterial({ color: 0xe62e2e }));
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 6.5, 0);
    banner.castShadow = true;
    archGroup.add(banner);

    this.scene.add(archGroup);
  }

  buildBarriers() {
    const wallDist = KART_CONFIG.WALL_HALF_WIDTH;
    const postCount = 110;
    const postGeo = this.registerDisposable(new THREE.BoxGeometry(0.9, 1.4, 2.2));
    const redMat = this.registerDisposable(new THREE.MeshStandardMaterial({ color: 0xd92626 }));
    const whiteMat = this.registerDisposable(new THREE.MeshStandardMaterial({ color: 0xf4f4f5 }));

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

  getLookAheadPoint(currentU, lookAhead = 0.028) {
    const targetU = (currentU + lookAhead) % 1;
    return this.curve.getPointAt(targetU);
  }

  getSurfaceInfo(position, hintIndex = -1) {
    const total = this.samples.length;
    let closest = this.samples[0];
    let minDistSq = Infinity;

    if (hintIndex >= 0 && hintIndex < total) {
      const windowRadius = 15;
      for (let offset = -windowRadius; offset <= windowRadius; offset++) {
        const idx = (hintIndex + offset + total) % total;
        const dSq = position.distanceToSquared(this.samples[idx].point);
        if (dSq < minDistSq) {
          minDistSq = dSq;
          closest = this.samples[idx];
        }
      }
    }

    if (minDistSq > (KART_CONFIG.WALL_HALF_WIDTH * 1.5) ** 2) {
      for (let i = 0; i < total; i++) {
        const dSq = position.distanceToSquared(this.samples[i].point);
        if (dSq < minDistSq) {
          minDistSq = dSq;
          closest = this.samples[i];
        }
      }
    }

    _toPos.set(position.x - closest.point.x, 0, position.z - closest.point.z);
    const alongTangent = _toPos.dot(closest.tangent);
    const projectedPoint = closest.point.clone().addScaledVector(closest.tangent, alongTangent);

    const dx = position.x - projectedPoint.x;
    const dz = position.z - projectedPoint.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    return {
      u: closest.u,
      sampleIndex: closest.index,
      tangent: closest.tangent,
      distance,
      closestPoint: projectedPoint,
      isOffRoad: distance > KART_CONFIG.TRACK_HALF_WIDTH,
      isOutOfBounds: distance > KART_CONFIG.WALL_HALF_WIDTH,
    };
  }

  dispose() {
    this.disposables.forEach((res) => res.dispose());
    this.disposables = [];
  }
}