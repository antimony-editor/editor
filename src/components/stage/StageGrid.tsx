import { useMemo } from "react";
import { Line } from "react-konva";

export function StageGrid({
  width,
  height,
  gridSize,
  stroke
}: {
  width: number;
  height: number;
  gridSize: number;
  stroke: string;
}) {
  const lines = useMemo(() => {
    const elements: React.ReactNode[] = [];
    for (let x = 0; x <= width; x += gridSize) {
      elements.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, height]}
          stroke={stroke}
          strokeWidth={1}
          listening={false}
        />
      );
    }
    for (let y = 0; y <= height; y += gridSize) {
      elements.push(
        <Line
          key={`h-${y}`}
          points={[0, y, width, y]}
          stroke={stroke}
          strokeWidth={1}
          listening={false}
        />
      );
    }
    return elements;
  }, [width, height, gridSize, stroke]);

  return <>{lines}</>;
}

export function StageROT({ width, height }: { width: number; height: number }) {
  const lines = useMemo(() => {
    const elements: React.ReactNode[] = [];
    const Wthird = width / 3;
    const Hthird = height / 3;
    const rotColor = "rgba(41, 248, 34, 0.56)";
    for (let x = 1; x <= 2; x++) {
      elements.push(
        <Line
          key={`v-${x}`}
          points={[x * Wthird, 0, x * Wthird, height]}
          stroke={rotColor}
          strokeWidth={2}
          listening={false}
        />
      );
    }
    for (let y = 1; y <= 2; y++) {
      elements.push(
        <Line
          key={`h-${y}`}
          points={[0, y * Hthird, width, y * Hthird]}
          stroke={rotColor}
          strokeWidth={2}
          listening={false}
        />
      );
    }

    return elements;
  }, [width, height]);

  return <>{lines}</>;
}
