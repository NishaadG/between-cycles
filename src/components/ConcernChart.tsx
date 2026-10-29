"use client";

import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ConcernId } from "@/lib/concerns";
import type { BaselineStat } from "@/lib/stats";
import type { Scan } from "@/lib/store";

export interface Point {
  day: number; // days since cycle 1 started (negative = before)
  value: number;
  kind: Scan["kind"];
}

export function toPoints(scans: Scan[], id: ConcernId, firstCycleStart: string): Point[] {
  const start = new Date(firstCycleStart + "T00:00:00").getTime();
  return scans
    .filter((s) => Number.isFinite(s.analysis.concerns[id]?.level))
    .map((s) => ({
      day: Math.round(((new Date(s.takenAt).getTime() - start) / 86_400_000) * 10) / 10,
      value: s.analysis.concerns[id].level,
      kind: s.kind,
    }));
}

export function ConcernChart({
  points,
  stat,
  cycleLength,
  color,
  height = 180,
  animate = true,
}: {
  points: Point[];
  stat: BaselineStat | null;
  cycleLength: number;
  color: string;
  height?: number;
  animate?: boolean;
}) {
  if (!points.length) return <p className="py-8 text-center text-sm text-muted">No scans yet.</p>;
  const values = points.map((p) => p.value);
  const lo = Math.min(...values, stat ? stat.mean - stat.mdc : Infinity);
  const hi = Math.max(...values, stat ? stat.mean + stat.mdc : -Infinity);
  const pad = Math.max(3, (hi - lo) * 0.15);
  const maxDay = Math.max(...points.map((p) => p.day), 1);
  const cycleStarts: number[] = [];
  for (let d = cycleLength; d <= maxDay; d += cycleLength) cycleStarts.push(d);
  const upper = stat ? stat.mean + stat.mdc : Infinity;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis
          dataKey="day"
          type="number"
          domain={["dataMin - 1", "dataMax + 1"]}
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickFormatter={(d: number) => (d < 0 ? "pre" : `D${Math.floor(d) + 1}`)}
          stroke="var(--line)"
        />
        <YAxis
          domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]}
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          stroke="var(--line)"
          allowDecimals={false}
        />
        {stat && (
          <ReferenceArea
            y1={stat.mean - stat.mdc}
            y2={stat.mean + stat.mdc}
            fill="var(--primary)"
            fillOpacity={0.12}
            stroke="none"
            ifOverflow="extendDomain"
          />
        )}
        <ReferenceLine x={0} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: "start", position: "insideTopLeft", fontSize: 10, fill: "var(--muted)" }} />
        {cycleStarts.map((d, i) => (
          <ReferenceLine
            key={d}
            x={d}
            stroke="var(--line)"
            strokeDasharray="4 4"
            label={{ value: `cycle ${i + 2}`, position: "insideTopLeft", fontSize: 10, fill: "var(--muted)" }}
          />
        ))}
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }}
          labelFormatter={(d) => (Number(d) < 0 ? "Before treatment" : `Day ${Math.floor(Number(d)) + 1} of treatment`)}
          formatter={(v) => [v, "Level"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          isAnimationActive={animate}
          dot={(props) => {
            const { cx, cy, payload, index } = props as { cx: number; cy: number; payload: Point; index: number };
            const above = payload.kind === "checkin" && payload.value > upper;
            return (
              <circle
                key={index}
                cx={cx}
                cy={cy}
                r={above ? 5 : 4}
                fill={above ? color : "var(--surface)"}
                stroke={color}
                strokeWidth={2}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
