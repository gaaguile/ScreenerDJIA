import CopperFuturesChart from "./components/CopperFuturesChart";

function App() {
  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-2">
            Copper Futures Dashboard
          </h1>
          <p className="text-center text-gray-400">
            Live / Delayed Term Structure • CME COMEX (HG)
          </p>
        </header>

        <main>
          <CopperFuturesChart />
        </main>

        <footer className="mt-12 text-center text-xs text-gray-500">
          Data is delayed • Built with Vite + React + Highcharts
        </footer>
      </div>
    </div>
  );
}

export default App;
