import { useEffect, useRef, useState } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BAR_DATA = [40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95];

export function RevenueChart() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl p-7">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-base font-semibold text-zn-text">Revenue Overview</h2>
      </div>

      <div ref={ref} className="rounded-xl p-5 bg-gradient-to-br from-zn-accent/5 to-zn-purple/5">
        <div className="flex items-end gap-2 h-[200px]">
          {BAR_DATA.map((value, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-zn-accent/30 to-zn-accent rounded-t transition-all hover:brightness-110"
              style={{
                height: visible ? `${value}%` : '0%',
                transition: `height 600ms ease ${i * 50}ms`,
              }}
            />
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          {MONTHS.map((month) => (
            <div key={month} className="flex-1 text-center text-xs text-zn-muted font-mono">{month}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
