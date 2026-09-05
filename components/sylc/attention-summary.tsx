import { AttentionSummary } from "@/lib/scoring/types";

export function AttentionHero({
  summary,
  isFirstVisit,
}: {
  summary: AttentionSummary;
  isFirstVisit: boolean;
}) {
  if (isFirstVisit || summary.watchlistSize === 0) return null;

  const headline =
    summary.needingAttention === 0
      ? `None of ${summary.watchlistSize} stocks need your attention`
      : `${summary.needingAttention} of ${summary.watchlistSize} stocks need your attention`;

  return (
    <section className="pt-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#00b386]">
        You don&apos;t need to check everything
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-[#191c27] sm:text-4xl">
        {headline}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-[#fff1ee] px-3 py-1 font-medium text-[#eb5b3c]">
          {summary.high} High
        </span>
        <span className="rounded-full bg-[#fff8e8] px-3 py-1 font-medium text-[#c4841d]">
          {summary.medium} Medium
        </span>
        <span className="rounded-full bg-[#eef9f6] px-3 py-1 font-medium text-[#00b386]">
          {summary.quiet} Quiet
        </span>
      </div>
    </section>
  );
}
