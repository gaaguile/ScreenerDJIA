import Highcharts from "highcharts/highstock";

export const darkCopperFuturesConfig = (
  priceData: number[],
  contracts: string[],
  oiData?: number[],
): Highcharts.Options => ({
  chart: {
    type: "line",
    backgroundColor: "#0f1620",
    plotBackgroundColor: "#0f1620",
    height: 650,
  },

  title: {
    text: "Copper Futures Term Structure (HG)",
    style: { color: "#e0e0e0" },
  },
  subtitle: { text: "CME COMEX • Delayed", style: { color: "#8a9ba8" } },

  xAxis: {
    type: "category",
    categories: contracts,
    labels: {
      style: { color: "#b0b8c4" },
      formatter: function () {
        return String(this.value);
      },
    },
    lineColor: "#334155",
  },

  yAxis: [
    {
      title: { text: "Price (USD/lb)", style: { color: "#e0e0e0" } },
      labels: { style: { color: "#b0b8c4" }, format: "${value:.4f}" },
      gridLineColor: "#1e2937",
    },
    {
      title: { text: "Open Interest", style: { color: "#94a3b8" } },
      opposite: true,
      labels: { style: { color: "#94a3b8" } },
      gridLineColor: "#1e2937",
    },
  ],

  series: [
    {
      name: "Copper Price",
      type: "line" as const,
      data: priceData,
      color: "#f59e0b",
      lineWidth: 3,
      marker: { enabled: true, radius: 4 },
    } as Highcharts.SeriesLineOptions,
    ...(oiData
      ? [
          {
            name: "Open Interest",
            type: "column" as const,
            data: oiData,
            color: "#3b82f6",
            yAxis: 1,
            opacity: 0.75,
          } as Highcharts.SeriesColumnOptions,
        ]
      : []),
  ] as Highcharts.SeriesOptions[],

  tooltip: {
    shared: true,
    backgroundColor: "#1e2937",
    style: { color: "#e0e0e0" },
  },
  legend: { itemStyle: { color: "#cbd5e1" } },

  credits: { enabled: false },
  exporting: { enabled: true },
});
