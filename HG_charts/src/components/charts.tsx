import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts/highstock";
import { darkCopperFuturesConfig } from "../charts/copperFuturesConfig";

export default function CopperFuturesChart() {
  // Example data - replace with your API response
  const contracts = ["Jul-26", "Sep-26", "Dec-26", "Mar-27", "May-27"];
  const prices = [4.25, 4.28, 4.32, 4.35, 4.38];
  const openInterest = [45000, 62000, 78000, 91000, 67000];

  const options = darkCopperFuturesConfig(prices, contracts, openInterest);

  return (
    <div className="w-full">
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        constructorType="stockChart"
      />
    </div>
  );
}
