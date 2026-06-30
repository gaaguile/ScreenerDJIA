"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.darkCopperFuturesConfig = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const highstock_1 = __importDefault(require("highcharts/highstock"));
const exporting_1 = __importDefault(require("highcharts/modules/exporting"));
const accessibility_1 = __importDefault(require("highcharts/modules/accessibility"));
// Initialize modules
(0, exporting_1.default)(highstock_1.default);
(0, accessibility_1.default)(highstock_1.default);
exports.darkCopperFuturesConfig = {
    chart: {
        type: "line",
        backgroundColor: "#0f1620",
        plotBackgroundColor: "#0f1620",
        height: 650,
        style: { fontFamily: "Inter, system-ui, sans-serif" },
    },
    title: {
        text: "Copper Futures Term Structure (HG)",
        style: { color: "#e0e0e0", fontSize: "18px", fontWeight: "500" },
    },
    subtitle: {
        text: "CME COMEX | Delayed Data",
        style: { color: "#8a9ba8" },
    },
    xAxis: {
        categories: [], // Populate dynamically: ['Jul-26', 'Sep-26', ...]
        labels: {
            style: { color: "#b0b8c4", fontSize: "13px" },
        },
        lineColor: "#334155",
        tickColor: "#334155",
    },
    yAxis: [
        {
            title: {
                text: "Price (USD per lb)",
                style: { color: "#e0e0e0" },
            },
            labels: {
                style: { color: "#b0b8c4" },
                format: "${value:.4f}",
            },
            gridLineColor: "#1e2937",
            opposite: false,
        },
        {
            title: {
                text: "Open Interest",
                style: { color: "#94a3b8" },
            },
            labels: { style: { color: "#94a3b8" } },
            gridLineColor: "#1e2937",
            opposite: true,
        },
    ],
    series: [
        {
            name: "Copper Price",
            type: "line",
            color: "#f59e0b", // Amber / Gold for metals feel
            lineWidth: 3,
            marker: {
                enabled: true,
                radius: 4,
                fillColor: "#f59e0b",
                lineColor: "#0f1620",
            },
            data: [], // e.g. [4.25, 4.28, 4.32, ...]
        },
        {
            name: "Open Interest",
            type: "column",
            color: "#3b82f6",
            yAxis: 1,
            opacity: 0.75,
            borderColor: "#1e40af",
            data: [], // Open interest values
        },
    ],
    tooltip: {
        shared: true,
        backgroundColor: "#1e2937",
        borderColor: "#475569",
        style: { color: "#e0e0e0" },
        valueDecimals: 4,
        formatter: function () {
            var _a, _b;
            // Custom formatter if needed
            return `<b>${this.x}</b><br/>Price: <b>$${(_b = (_a = this.points) === null || _a === void 0 ? void 0 : _a[0].y) === null || _b === void 0 ? void 0 : _b.toFixed(4)}</b>`;
        },
    },
    legend: {
        itemStyle: { color: "#cbd5e1" },
        itemHoverStyle: { color: "#ffffff" },
    },
    plotOptions: {
        line: {
            animation: true,
            dataLabels: { enabled: false },
        },
        column: {
            animation: true,
        },
    },
    rangeSelector: {
        enabled: true,
        buttonTheme: {
            fill: "#1e2937",
            stroke: "#475569",
            style: { color: "#e0e0e0" },
        },
        inputBoxBorderColor: "#475569",
        inputStyle: { color: "#e0e0e0" },
    },
    navigator: {
        enabled: true,
        xAxis: { gridLineColor: "#334155" },
        series: { color: "#64748b" },
    },
    scrollbar: {
        barBackgroundColor: "#475569",
        barBorderColor: "#334155",
    },
    credits: {
        enabled: false,
    },
    exporting: {
        enabled: true,
        buttons: {
            contextButton: {
                menuItems: ["downloadPNG", "downloadPDF", "downloadCSV"],
            },
        },
    },
};
(0, jsx_runtime_1.jsx)(HighchartsReact, { highcharts: highstock_1.default, options: exports.darkCopperFuturesConfig, constructorType: "stockChart" // Use for Highstock features
 });
//# sourceMappingURL=charts.js.map