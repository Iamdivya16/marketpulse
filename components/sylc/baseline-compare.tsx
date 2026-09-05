import { formatClock, formatUsd } from "@/lib/format";

export function BaselineCompare({
  since,
  currentAt,
  baselinePrice,
  currentPrice,
  priceChangePct,
}: {
  since: string;
  currentAt?: string;
  baselinePrice: number;
  currentPrice: number;
  priceChangePct: number;
}) {
  const up = priceChangePct >= 0;

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div className="rounded-xl bg-[#f8f8f8] px-4 py-3">
        <p className="text-xs font-semibold text-[#666a7a]">Last checked</p>
        <p className="mt-1 text-sm tabular-nums text-[#666a7a]">{formatClock(since)}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-[#191c27]">
          {formatUsd(baselinePrice)}
        </p>
      </div>
      <div className="hidden text-center text-[#00b386] sm:block">↓</div>
      <div className="rounded-xl border border-[#d6f3eb] bg-[#eef9f6] px-4 py-3">
        <p className="text-xs font-semibold text-[#00b386]">Current</p>
        <p className="mt-1 text-sm tabular-nums text-[#00b386]">
          {currentAt ? formatClock(currentAt) : "Now"}
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-[#191c27]">
          {formatUsd(currentPrice)}
        </p>
      </div>
      <p className={`text-sm font-semibold tabular-nums sm:col-span-3 ${up ? "gain" : "loss"}`}>
        {formatUsd(baselinePrice)} → {formatUsd(currentPrice)} · {up ? "+" : "−"}
        {Math.abs(priceChangePct).toFixed(2)}%
      </p>
    </div>
  );
}
