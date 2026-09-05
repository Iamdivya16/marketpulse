"use client";

import { SignalContribution } from "@/lib/scoring/types";

const LABELS: Record<string, string> = {
  price: "Price",
  volume: "Volume",
  news: "News",
  sentiment: "Sentiment",
  volatility: "Volatility",
};

export function SignalBreakdown({ contributions }: { contributions: SignalContribution[] }) {
  const maxPoints = Math.max(...contributions.map((item) => item.points), 1);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#666a7a]">
        What drove the score
      </p>
      {contributions.map((item) => (
        <div key={item.signal} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3">
          <span className="text-sm text-[#666a7a]">{LABELS[item.signal] ?? item.signal}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#eef2f0]">
            <div
              className="h-full rounded-full bg-[#00b386] transition-[width] duration-300"
              style={{ width: `${Math.max(3, (item.points / maxPoints) * 100)}%` }}
            />
          </div>
          <span className="text-right text-sm font-medium tabular-nums text-[#191c27]">
            {item.points}
          </span>
        </div>
      ))}
    </div>
  );
}
