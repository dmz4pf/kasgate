import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from 0 to target using requestAnimationFrame.
 * Handles strings like "12,847", "847 KAS", "94.2%", and plain numbers.
 */
export function useAnimatedValue(
  value: string | number,
  duration = 800,
  enabled = true
): string {
  const [display, setDisplay] = useState(enabled ? '' : String(value));
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const prevValue = useRef<string | number>('');

  useEffect(() => {
    if (!enabled || value === prevValue.current) return;
    prevValue.current = value;

    const str = String(value);

    // Extract numeric part: "12,847" → 12847, "847 KAS" → 847, "94.2%" → 94.2
    const match = str.match(/^([^0-9]*?)([\d,]+\.?\d*)(.*)/);
    if (!match) {
      setDisplay(str);
      return;
    }

    const [, prefix, numStr, suffix] = match;
    const cleanNum = numStr.replace(/,/g, '');
    const target = parseFloat(cleanNum);
    const hasCommas = numStr.includes(',');
    const decimals = cleanNum.includes('.') ? cleanNum.split('.')[1].length : 0;

    if (isNaN(target) || target === 0) {
      setDisplay(str);
      return;
    }

    cancelAnimationFrame(rafRef.current);
    startRef.current = 0;

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      let formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toString();

      if (hasCommas) {
        const parts = formatted.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formatted = parts.join('.');
      }

      setDisplay(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, enabled]);

  return display;
}
