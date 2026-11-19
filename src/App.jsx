import { useEffect, useRef, useState } from 'react';
import { Engine } from './game/core/Engine';
import { HUD } from './components/hud/HUD';

export default function App() {
  const mountRef = useRef(null);
  const [hudData, setHudData] = useState({});

  useEffect(() => {
    if (!mountRef.current) return;
    const engine = new Engine(mountRef.current, setHudData);
    return () => engine.dispose();
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden select-none bg-sky-400">
      <div ref={mountRef} className="w-full h-full" />
      <HUD {...hudData} />
    </div>
  );
}