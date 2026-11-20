"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type RegistrationChartPoint = { label: string; pendaftar: number };

export function RegistrationChart({ data }: { data: RegistrationChartPoint[] }) {
  return (
    <div className="h-64 w-full" role="img" aria-label="Grafik tren pendaftar dari Januari hingga Juni">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} dy={8} interval={4} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
          <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#E2E8F0", fontSize: 12 }} />
          <Line type="monotone" dataKey="pendaftar" name="Pendaftar" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, fill: "#2563EB", strokeWidth: 0 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}