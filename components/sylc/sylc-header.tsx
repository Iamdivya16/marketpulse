"use client";

import { formatDistanceToNow } from "date-fns";
import { AcknowledgeButton } from "@/components/sylc/acknowledge-button";
import { getUsMarketSession } from "@/lib/market-data/cache";

type SylcHeaderProps = {
  since: string | null;
  dataAsOf: string;
  degraded: boolean;
  watchlistCount?: number;
  onAcknowledged?: () => void;
};

export function SylcHeader({
  since,
  dataAsOf,
  degraded,
  watchlistCount = 0,
  onAcknowledged,
}: SylcHeaderProps) {
  const session = getUsMarketSession();
  const dataAge = formatDistanceToNow(new Date(dataAsOf), { addSuffix: true });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium text-[#00b386]">Watchlist</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#191c27] sm:text-[28px]">
          Since you last checked
        </h1>
        <p className="mt-1.5 text-sm text-[#666a7a]">
          {since
            ? `Comparing against your baseline from ${formatDistanceToNow(new Date(since), { addSuffix: true })}.`
            : "Set a baseline to start tracking meaningful changes across your watchlist."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#666a7a]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${session === "Open" ? "bg-[#00b386]" : "bg-[#b0b3bf]"}`}
            />
            US Market · {session}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Data updated {dataAge}
            {degraded ? " · some sources unavailable" : ""}
          </span>
        </div>
      </div>
      <AcknowledgeButton
        disabled={watchlistCount === 0}
        onSuccess={() => onAcknowledged?.()}
      />
    </div>
  );
}
