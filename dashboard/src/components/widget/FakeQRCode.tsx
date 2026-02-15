import { cn } from '@/lib/utils';

interface FakeQRCodeProps {
  size?: number;
  className?: string;
}

/**
 * Generates a deterministic fake QR code pattern for UI preview purposes.
 * This is NOT a real QR code - just a visual representation.
 */
export function FakeQRCode({ size = 180, className }: FakeQRCodeProps) {
  // Generate a deterministic pattern for the QR code
  const gridSize = 25;
  const cellSize = size / gridSize;

  // Seed-based pseudo-random for consistent pattern
  const seed = 42;
  const pattern: boolean[][] = [];

  for (let y = 0; y < gridSize; y++) {
    pattern[y] = [];
    for (let x = 0; x < gridSize; x++) {
      // Position finders (three corners)
      const isTopLeftFinder = x < 7 && y < 7;
      const isTopRightFinder = x >= gridSize - 7 && y < 7;
      const isBottomLeftFinder = x < 7 && y >= gridSize - 7;

      if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
        // Finder pattern logic
        const fx = x < 7 ? x : (x >= gridSize - 7 ? x - (gridSize - 7) : 0);
        const fy = y < 7 ? y : (y >= gridSize - 7 ? y - (gridSize - 7) : 0);

        // Outer border or inner square
        pattern[y][x] = (
          fx === 0 || fx === 6 || fy === 0 || fy === 6 || // outer
          (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4) // inner
        );
      } else {
        // Data area - pseudo-random but deterministic
        const hash = ((x * 7 + y * 13 + seed) * 31) % 100;
        pattern[y][x] = hash > 50;
      }
    }
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl p-3 shadow-lg',
        className
      )}
      style={{ width: size + 24, height: size + 24 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
      >
        {pattern.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#030712"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}
