import { useEffect, useRef, useState } from 'react';
import { Engine } from './game/Engine';
import { HUD } from './components/HUD';

export default function App() {
  const mountRef = useRef(null);
  const [hudData, setHudData] = useState({ speedKmh: 0 });

  useEffect(() => {
    if (!mountRef.current) return;
    const engine = new Engine(mountRef.current, setHudData);

    return () => engine.dispose();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-sky-400">
      <div ref={mountRef} className="w-full h-full" />
      <HUD speedKmh={hudData.speedKmh} />
    </div>
  );
}