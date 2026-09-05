"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,
} from "lightweight-charts";

type PriceChartProps = {
  bars: Array<{ date: string; close: number }>;
};

export function PriceChart({ bars }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;

    let chart: IChartApi | null = null;
    let series: ISeriesApi<"Line"> | null = null;

    chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#666a7a",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#f0f0f2" },
      },
      width: containerRef.current.clientWidth,
      height: 280,
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    series = chart.addSeries(LineSeries, {
      color: "#00b386",
      lineWidth: 2,
    });

    const data: LineData[] = [];
    const seen = new Set<string>();
    for (const bar of [...bars].sort((a, b) => a.date.localeCompare(b.date))) {
      if (!bar.date || seen.has(bar.date) || !Number.isFinite(bar.close)) continue;
      seen.add(bar.date);
      data.push({ time: bar.date, value: bar.close });
    }
    if (data.length === 0) return;

    series.setData(data);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current && chart) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart?.remove();
    };
  }, [bars]);

  return <div ref={containerRef} className="w-full overflow-hidden rounded-xl bg-[#fafafa]" />;
}
