import Link from "next/link";
import { SylcItem } from "@/lib/scoring/types";
import { SignalBreakdown } from "@/components/sylc/signal-breakdown";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSignedPct } from "@/lib/format";

const severityCopy = {
  high: "High Attention",
  medium: "Medium Attention",
  low: "Low Attention",
};

const severityDot = {
  high: "bg-[#eb5b3c]",
  medium: "bg-[#c4841d]",
  low: "bg-[#00b386]",
};

function factsLine(item: SylcItem): string {
  if (item.headline && item.headline.includes("since last check")) {
    return item.headline;
  }

  const parts = [
    `${formatSignedPct(item.signals.priceChangePct)} since last check`,
  ];
  if (item.signals.volumeRatio >= 1.05) {
    parts.push(`${item.signals.volumeRatio.toFixed(1)}× normal volume`);
  }
  if (item.signals.newsCount > 0) {
    parts.push(
      `${item.signals.newsCount} new headline${item.signals.newsCount === 1 ? "" : "s"}`,
    );
  }
  return parts.join(" · ");
}

export function AttentionCard({
  item,
  rank,
}: {
  item: SylcItem;
  rank?: number;
}) {
  return (
    <article className="groww-card p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {rank != null && (
              <span className="text-sm font-medium text-[#666a7a]">{rank}</span>
            )}
            <span
              className={cn("h-2.5 w-2.5 shrink-0 rounded-full", severityDot[item.severity])}
              aria-hidden
            />
            <h2 className="text-xl font-semibold text-[#191c27] sm:text-2xl">
              {item.ticker}
              <span className="font-medium text-[#666a7a]"> — {severityCopy[item.severity]}</span>
            </h2>
          </div>
          <p className="mt-1 text-sm text-[#666a7a]">{item.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#666a7a]">
            Attention score
          </p>
          <p className="text-4xl font-semibold tabular-nums leading-none text-[#191c27] sm:text-5xl">
            {item.score}
            <span className="ml-1 text-base font-medium text-[#666a7a]">/ 100</span>
          </p>
        </div>
      </div>

      <p className="mt-5 text-[15px] font-medium leading-relaxed text-[#191c27]">
        {factsLine(item)}
      </p>

      <div className="mt-5">
        <p className="text-sm font-semibold text-[#191c27]">Why it matters</p>
        <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-[#44475b]">
          {item.whyItMatters}
        </p>
      </div>

      <div className="mt-6">
        <SignalBreakdown contributions={item.contributions} />
      </div>

      <Link
        href={`/stocks/${item.ticker}`}
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#00b386]"
      >
        Open {item.ticker} <ChevronRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
