import type { AlpacaBar } from "@alpacahq/alpaca-trade-api/dist/resources/datav2/entityv2";

const Alpaca = require("@alpacahq/alpaca-trade-api");

const alpaca = new Alpaca({
  keyId: process.env.APCA_API_KEY_ID,
  secretKey: process.env.APCA_API_SECRET_KEY,
  paper: true,
});

// Get all the stocks we own
async function getPositionBars() {
  const positions = await alpaca.getPositions();
  console.log(positions);
  const positionSymbols = positions.map((p: any) => p.symbol);

  // Determine if we should sell any of our stocks
  const daysToFetch = 151;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToFetch);

  const bars = alpaca.getMultiBarsAsyncV2(positionSymbols, {
    start: startDate.toISOString().slice(0, 10),
    timeframe: alpaca.newTimeframe(1, alpaca.timeframeUnit.DAY),
    limit: daysToFetch,
  });
  const barsReceived = [];
  for await (let b of bars) {
    barsReceived.push(b);
  }
  barsReceived.reverse();
  console.log(barsReceived);

  return barsReceived;
}

// Calculate moving averages
function calculateAverages(stockBars: AlpacaBar[]) {
  let shortAverage = 0;
  let longAverage = 0;

  if (stockBars.length >= 30) {
    const shortStockBars = stockBars.map((bar) => bar.ClosePrice).splice(0, 30);
    shortAverage =
      shortStockBars.reduce((x, y) => x + y) / shortStockBars.length;
  }

  if (stockBars.length >= 100) {
    const longStockBars = stockBars.map((bar) => bar.ClosePrice).splice(0, 100);
    longAverage = longStockBars.reduce((x, y) => x + y) / longStockBars.length;
  }

  return [shortAverage, longAverage];
}

const positionBars = await getPositionBars();
const positionAverages = calculateAverages(positionBars);
console.log("positionAverages", positionAverages);

// Sell any stocks we should sell

// Determine if we should buy any new stocks

// Buy any new stocks we should buy
