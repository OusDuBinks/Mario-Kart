import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function App() {
  const mountRef = useRef(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const resetTriggerRef = useRef(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    container.innerHTML = '';

    // 1. SCÈNE, CAMÉRA ET RENDU
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Ciel bleu
    scene.fog = new THREE.Fog(0x87ceeb, 60, 220);

    const camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. LUMIÈRES
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(40, 80, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 200;
    const d = 80;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);

    // 3. SOL ET REPÈRES DE CIRCUIT
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3b7a57 }); // Herbe
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Piste en asphalte (anneau)
    const trackGeo = new THREE.RingGeometry(35, 55, 64);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.02;
    track.receiveShadow = true;
    scene.add(track);

    // Grille de repère spatial
    const grid = new THREE.GridHelper(600, 60, 0x000000, 0x000000);
    grid.position.y = 0.01;
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    scene.add(grid);

    // Plots autour du circuit pour donner une sensation de vitesse
    const pylonGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xff3333 : 0xffffff,
      });

      // Bordure intérieure
      const innerPylon = new THREE.Mesh(pylonGeo, mat);
      innerPylon.position.set(Math.cos(angle) * 34, 0.75, Math.sin(angle) * 34);
      innerPylon.castShadow = true;
      scene.add(innerPylon);

      // Bordure extérieure
      const outerPylon = new THREE.Mesh(pylonGeo, mat);
      outerPylon.position.set(Math.cos(angle) * 56, 0.75, Math.sin(angle) * 56);
      outerPylon.castShadow = true;
      scene.add(outerPylon);
    }

    // 4. CONSTRUCTION DU KART (Groupe 3D)
    const kart = new THREE.Group();
    kart.position.set(45, 0, 0); // Placé sur la piste
    scene.add(kart);

    // Châssis
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.5, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xe62e2e })
    );
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    kart.add(chassis);

    // Pilote (tête/casque)
    const driver = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xffcc00 })
    );
    driver.position.set(0, 1.1, -0.1);
    driver.castShadow = true;
    kart.add(driver);

    // Roues
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

    const wheelPositions = [
      [-0.95, 0.4, 0.85],  // Avant gauche
      [0.95, 0.4, 0.85],   // Avant droit
      [-0.95, 0.4, -0.85], // Arrière gauche
      [0.95, 0.4, -0.85],  // Arrière droit
    ];

    const wheels = wheelPositions.map(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      kart.add(wheel);
      return wheel;
    });

    // 5. CONTRÔLES CLAVIER (AZERTY + QWERTY + Flèches)
    const keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
    };

    const handleKeyDown = (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keys.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') keys.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') keys.right = true;
      if (code === 'KeyR') resetTriggerRef.current = true;
    };

    const handleKeyUp = (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keys.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') keys.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 6. PHYSIQUE & BOUCLE DE JEU (Indépendante du framerate)
    const clock = new THREE.Clock();
    let speed = 0;
    let heading = 0; // Angle de direction en radians
    let lastDisplayedSpeed = -1;
    let animationFrameId;

    const MAX_SPEED = 36;
    const MAX_REVERSE = -14;
    const ACCELERATION = 26;
    const BRAKING = 40;
    const FRICTION = 14;
    const TURN_SPEED = 2.4;

    const currentCamPos = new THREE.Vector3(45, 6, -10);
    const currentLookAt = new THREE.Vector3(45, 1, 0);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Delta time borné à 0.1s pour éviter les sauts si on change d'onglet
      const delta = Math.min(clock.getDelta(), 0.1);

      // Réinitialisation position
      if (resetTriggerRef.current) {
        kart.position.set(45, 0, 0);
        speed = 0;
        heading = 0;
        resetTriggerRef.current = false;
      }

      // Accélération et freinage
      if (keys.forward) {
        speed += ACCELERATION * delta;
      } else if (keys.backward) {
        speed -= (speed > 0 ? BRAKING : ACCELERATION * 0.7) * delta;
      } else {
        // Décélération naturelle (friction)
        if (Math.abs(speed) < FRICTION * delta) {
          speed = 0;
        } else {
          speed -= Math.sign(speed) * FRICTION * delta;
        }
      }

      speed = THREE.MathUtils.clamp(speed, MAX_REVERSE, MAX_SPEED);

      // Braquage (actif uniquement quand le kart roule)
      let steerInput = 0;
      if (keys.left) steerInput += 1;
      if (keys.right) steerInput -= 1;

      if (Math.abs(speed) > 0.3) {
        const reverseFactor = speed >= 0 ? 1 : -1;
        heading += steerInput * TURN_SPEED * reverseFactor * delta;
      }

      // Déplacement du kart
      kart.rotation.y = heading;
      kart.position.x += Math.sin(heading) * speed * delta;
      kart.position.z += Math.cos(heading) * speed * delta;

      // Effets visuels : inclinaison du châssis et braquage des roues avant
      chassis.rotation.z = THREE.MathUtils.lerp(
        chassis.rotation.z,
        -steerInput * 0.12 * (speed / MAX_SPEED),
        10 * delta
      );
      wheels[0].rotation.y = steerInput * 0.35;
      wheels[1].rotation.y = steerInput * 0.35;

      // Mise à jour fluide de la caméra (3e personne)
      const idealOffset = new THREE.Vector3(
        -Math.sin(heading) * 7.5,
        3.6,
        -Math.cos(heading) * 7.5
      );
      const idealCamPos = kart.position.clone().add(idealOffset);
      currentCamPos.lerp(idealCamPos, 1 - Math.exp(-8 * delta));
      camera.position.copy(currentCamPos);

      const idealLookAt = new THREE.Vector3(
        kart.position.x + Math.sin(heading) * 5,
        kart.position.y + 1.2,
        kart.position.z + Math.cos(heading) * 5
      );
      currentLookAt.lerp(idealLookAt, 1 - Math.exp(-12 * delta));
      camera.lookAt(currentLookAt);

      // Mise à jour du compteur React (uniquement si l'entier change)
      const displayKmh = Math.round(Math.abs(speed) * 3.5);
      if (displayKmh !== lastDisplayedSpeed) {
        lastDisplayedSpeed = displayKmh;
        setSpeedKmh(displayKmh);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. GESTION DU REDIMENSIONNEMENT
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Nettoyage propre au démontage
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-sky-400">
      {/* Canvas 3D Three.js */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Interface (HUD) */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white p-4 rounded-xl border border-white/15 shadow-lg">
        <h1 className="font-bold text-lg tracking-wide text-amber-400">
          KART PROTOTYPE
        </h1>
        <ul className="text-xs text-gray-200 mt-2 space-y-1">
          <li>
            <span className="font-semibold text-white">Z / W / ↑</span> : Accélérer
          </li>
          <li>
            <span className="font-semibold text-white">S / ↓</span> : Freiner / Reculer
          </li>
          <li>
            <span className="font-semibold text-white">Q / D / ← →</span> : Tourner
          </li>
          <li>
            <span className="font-semibold text-white">R</span> : Replacer sur la piste
          </li>
        </ul>
      </div>

      {/* Compteur de vitesse */}
      <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur-md text-white px-6 py-3 rounded-2xl border border-white/15 shadow-xl flex items-baseline gap-2">
        <span className="text-4xl font-black italic tracking-tighter text-amber-400">
          {speedKmh}
        </span>
        <span className="text-xs font-bold uppercase text-gray-300">km/h</span>
      </div>
    </div>
  );
}