import { formatDistanceToNow } from "date-fns";
import { formatClock } from "@/lib/format";
import { CircleCheck } from "lucide-react";

export function QuietState({
  watchlistSize,
  since,
}: {
  watchlistSize: number;
  since: string | null;
}) {
  return (
    <section className="groww-card px-5 py-10 text-center sm:px-8">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#eef9f6] text-[#00b386]">
        <CircleCheck className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-[#00b386]">All quiet since your last check</p>
      <p className="mt-2 text-2xl font-semibold text-[#191c27]">
        0 of {watchlistSize} stocks need your attention
      </p>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#666a7a]">
        No meaningful combination of price, volume, news, sentiment or volatility changes was
        detected.
      </p>
      {since && (
        <p className="mt-5 text-xs text-[#666a7a]">
          Last checked: {formatClock(since)} ·{" "}
          {formatDistanceToNow(new Date(since), { addSuffix: true })}
        </p>
      )}
    </section>
  );
}
