import { WatchlistRosterItem } from "@/lib/scoring/types";
import { formatSignedPct, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const statusLabel = {
  high: "High",
  medium: "Medium",
  low: "Quiet",
};

const statusTone = {
  high: "bg-[#fff1ee] text-[#eb5b3c]",
  medium: "bg-[#fff8e8] text-[#c4841d]",
  low: "bg-[#eef9f6] text-[#00b386]",
};

export function WatchlistRow({
  item,
  roster,
  onRemove,
}: {
  item: { symbolId: string; ticker: string; name: string };
  roster?: WatchlistRosterItem;
  onRemove: () => void;
}) {
  const severity = roster?.severity ?? "low";
  const quiet = !roster?.needsAttention;

  return (
    <div className="flex items-center gap-3 py-3.5">
      <Link
        href={`/stocks/${item.ticker}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef9f6] text-xs font-semibold text-[#00b386]">
          {item.ticker.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#191c27]">{item.ticker}</p>
          <p className="truncate text-sm text-[#666a7a]">{item.name}</p>
        </div>
        <div className="shrink-0 text-right">
          {roster?.price != null ? (
            <>
              <p className="font-medium tabular-nums text-[#191c27]">{formatUsd(roster.price)}</p>
              {roster.priceChangePct != null && (
                <p
                  className={cn(
                    "text-sm tabular-nums",
                    roster.priceChangePct >= 0 ? "gain" : "loss",
                  )}
                >
                  {formatSignedPct(roster.priceChangePct)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#666a7a]">—</p>
          )}
        </div>
      </Link>
      <div className="hidden w-24 shrink-0 text-right sm:block">
        {roster?.score != null ? (
          <>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                quiet ? statusTone.low : statusTone[severity],
              )}
            >
              {quiet ? "Quiet" : statusLabel[severity]}
            </span>
            <p className="mt-1 text-xs tabular-nums text-[#666a7a]">{roster.score}/100</p>
          </>
        ) : (
          <p className="text-xs text-[#666a7a]">No baseline</p>
        )}
      </div>
      <Button variant="ghost" size="sm" className="shrink-0 text-[#666a7a]" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}
