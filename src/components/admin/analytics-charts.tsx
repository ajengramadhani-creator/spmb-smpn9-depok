"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CountPoint = { name: string; jumlah: number };

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
      <h2 className="mb-4 font-semibold text-navy">{title}</h2>
      {children}
    </section>
  );
}

function EmptyChart() {
  return <div className="flex h-64 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500">Belum ada data untuk ditampilkan.</div>;
}

export function AnalyticsCharts({
  byTrack,
  byCity,
  bySchool,
  dailyRegistrations,
}: {
  byTrack: Array<CountPoint & { kuota: number }>;
  byCity: CountPoint[];
  bySchool: CountPoint[];
  dailyRegistrations: Array<{ label: string; pendaftar: number }>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartPanel title="Pendaftar per jalur">
        {byTrack.length ? (
          <div className="h-64 w-full" role="img" aria-label="Grafik jumlah pendaftar per jalur">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTrack} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#E2E8F0", fontSize: 12 }} />
                <Bar dataKey="jumlah" name="Pendaftar" fill="#2563EB" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyChart />}
      </ChartPanel>
      <ChartPanel title="Pendaftar per wilayah · 10 teratas">
        {byCity.length ? (
          <div className="h-64 w-full" role="img" aria-label="Grafik jumlah pendaftar per wilayah">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCity} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" horizontal={false} />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={90} axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#E2E8F0", fontSize: 12 }} />
                <Bar dataKey="jumlah" name="Pendaftar" fill="#0F766E" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyChart />}
      </ChartPanel>
      <ChartPanel title="Asal sekolah · 10 teratas">
        {bySchool.length ? (
          <div className="h-64 w-full" role="img" aria-label="Grafik asal sekolah pendaftar">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySchool} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" horizontal={false} />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={130} axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#E2E8F0", fontSize: 12 }} />
                <Bar dataKey="jumlah" name="Pendaftar" fill="#7C3AED" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyChart />}
      </ChartPanel>
      <ChartPanel title="Tren pendaftaran harian · 30 hari terakhir">
        {dailyRegistrations.some((item) => item.pendaftar > 0) ? (
          <div className="h-64 w-full" role="img" aria-label="Grafik tren pendaftaran harian">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyRegistrations} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} interval={4} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#E2E8F0", fontSize: 12 }} />
                <Line type="monotone" dataKey="pendaftar" name="Pendaftar" stroke="#2563EB" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyChart />}
      </ChartPanel>
    </div>
  );
}
