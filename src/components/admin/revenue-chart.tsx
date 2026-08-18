"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatKWD } from "@/lib/utils";

export function RevenueChart({ data }: { data: { day: string; total: number; count: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-saveo-emerald-700/50">No order data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0B3D2E" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#0B3D2E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} width={40} />
        <Tooltip
          formatter={(value: number) => [formatKWD(value), "Revenue"]}
          labelStyle={{ fontSize: 12 }}
        />
        <Area type="monotone" dataKey="total" stroke="#0B3D2E" strokeWidth={2} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
