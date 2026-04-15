import * as React from "react";
import { useState, useEffect } from "react";
import { B } from "./constants";

interface IZoomOverlayProps {
  onComplete: () => void;
}

export default function ZoomOverlay({ onComplete }: IZoomOverlayProps): JSX.Element {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const t1 = setTimeout(() => setOpacity(0), 50);
    const t2 = setTimeout(onComplete, 380);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100, pointerEvents: "none",
        background: B.navy,
        opacity,
        transition: "opacity 0.32s ease",
      }}
    />
  );
}
