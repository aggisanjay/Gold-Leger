import { fmtMonth } from "@/lib/format";
import { formatPercentBp } from "@/domain/units";

/** Unexplained loss as a share of the gold issued, by month, against the 0.15% target. */
export function LossTrend({ trend, targetBp }: { trend: { month: string; lossBp: number }[]; targetBp: number }) {
  const data = trend.slice(-6);
  if (!data.length) return <p className="text-[13.5px] text-mute">Not enough closed jobs yet.</p>;
  const max = Math.max(targetBp * 2.2, ...data.map((d) => d.lossBp), 10);
  const H = 84, W = 300, bw = 28, gap = (W - data.length * bw) / (data.length + 1);
  const y = (v: number) => H - (v / max) * H;
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label="Unexplained loss by month against the target" className="w-full">
      <line x1="0" x2={W} y1={y(targetBp)} y2={y(targetBp)} stroke="#8f6f12" strokeDasharray="3 3" strokeWidth="1" />
      <text x={W} y={y(targetBp) - 4} textAnchor="end" fontSize="9.5" fill="#8f6f12" fontFamily="var(--font-sans)">target {formatPercentBp(targetBp)}%</text>
      {data.map((d, i) => {
        const x = gap + i * (bw + gap), h = Math.max(1.5, H - y(d.lossBp));
        return (
          <g key={d.month}>
            <rect x={x} y={H - h} width={bw} height={h} rx="2" fill={d.lossBp > targetBp ? "#2f4ea2" : "#14161a"} opacity={i === data.length - 1 ? 1 : 0.55} />
            <text x={x + bw / 2} y={H - h - 4} textAnchor="middle" fontSize="9.5" fill="#3b414c" fontFamily="var(--font-mono)">{formatPercentBp(d.lossBp)}</text>
            <text x={x + bw / 2} y={H + 14} textAnchor="middle" fontSize="10" fill="#646c79" fontFamily="var(--font-sans)">{fmtMonth(d.month)}</text>
          </g>
        );
      })}
    </svg>
  );
}
