"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CopperFuturesChart;
const jsx_runtime_1 = require("react/jsx-runtime");
const highcharts_react_official_1 = require("highcharts-react-official");
const highstock_1 = require("highcharts/highstock");
const copperFuturesConfig_1 = require("../charts/copperFuturesConfig");
function CopperFuturesChart() {
    // Example data - replace with your API response
    const contracts = ["Jul-26", "Sep-26", "Dec-26", "Mar-27", "May-27"];
    const prices = [4.25, 4.28, 4.32, 4.35, 4.38];
    const openInterest = [45000, 62000, 78000, 91000, 67000];
    const options = (0, copperFuturesConfig_1.darkCopperFuturesConfig)(prices, contracts, openInterest);
    return ((0, jsx_runtime_1.jsx)("div", { className: "w-full", children: (0, jsx_runtime_1.jsx)(highcharts_react_official_1.default, { highcharts: highstock_1.default, options: options, constructorType: "stockChart" }) }));
}
//# sourceMappingURL=charts.js.map