"use client";

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { formatKWD } from "@/lib/utils";

const COLORS = ["#0B3D2E", "#D4AF37", "#347a5f", "#e2c15c", "#96c4ac", "#f0d788"];

export function DailySalesChart({ data }: { data: { day: string; total: number }[] }) {
  if (data.length === 0) return <EmptyChart label="No sales in the last 30 days yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="dailySalesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0B3D2E" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0B3D2E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
        <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 10 }} width={40} />
        <Tooltip formatter={(v: number) => [formatKWD(v), "Sales"]} labelStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="total" stroke="#0B3D2E" strokeWidth={2} fill="url(#dailySalesFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MonthlyRevenueChart({ data }: { data: { month: string; total: number }[] }) {
  if (data.length === 0) return <EmptyChart label="No revenue history yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} width={40} />
        <Tooltip formatter={(v: number) => [formatKWD(v), "Revenue"]} />
        <Bar dataKey="total" fill="#D4AF37" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OrdersByStatusChart({ data }: { data: { status: string; count: number }[] }) {
  if (data.length === 0 || data.every((d) => d.count === 0)) return <EmptyChart label="No orders yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={(d) => `${d.status}`}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopProductsChart({ data }: { data: { name: string; revenue: number }[] }) {
  if (data.length === 0) return <EmptyChart label="No product sales yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#0000000d" />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
        <Tooltip formatter={(v: number) => [formatKWD(v), "Revenue"]} />
        <Bar dataKey="revenue" fill="#0B3D2E" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueByCategoryChart({ data }: { data: { category: string; revenue: number }[] }) {
  if (data.length === 0) return <EmptyChart label="No category revenue yet." />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={(d) => d.category}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatKWD(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-[240px] items-center justify-center text-sm text-saveo-emerald-700/40">{label}</div>;
}
