import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts/highstock";
import { darkCopperFuturesConfig } from "../charts/copperFuturesConfig";

export default function CopperFuturesChart() {
  // Replace with real data from your API
  const contracts = [
    "Jul-26",
    "Sep-26",
    "Dec-26",
    "Mar-27",
    "May-27",
    "Jul-27",
  ];
  const prices = [4.25, 4.28, 4.32, 4.35, 4.38, 4.41];
  const openInterest = [45000, 62000, 78000, 91000, 67000, 52000];

  const options = darkCopperFuturesConfig(prices, contracts, openInterest);

  return (
    <div className="w-full bg-[#0f1620] p-4 rounded-xl">
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        constructorType="stockChart" // Important for futures-style charts
      />
    </div>
  );
}
