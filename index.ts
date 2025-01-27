import type { AlpacaBar } from "@alpacahq/alpaca-trade-api/dist/resources/datav2/entityv2";

const Alpaca = require("@alpacahq/alpaca-trade-api");

const alpaca = new Alpaca({
  keyId: process.env.APCA_API_KEY_ID,
  secretKey: process.env.APCA_API_SECRET_KEY,
  paper: true,
});

// // Main function
// const positionBars = await getPositionBars();
// const [shortAverage, longAverage] = calculateAverages(positionBars);
// console.log("positionAverages", shortAverage, longAverage);

// // Sell any stocks we should sell
// if (longAverage === 0 || shortAverage <= longAverage) {
//   console.log("Sell the stock");
//   alpaca.createOrder({
//     symbol: "AAPL",
//     qty: 1,
//     side: "sell",
//     type: "market",
//     time_in_force: "day",
//   });
// }

const account = await alpaca.getAccount();
const cash = account.cash;

const affordableSymbols = await getAffordableSymbols(cash);

// Determine if we should buy any of them
// Buy any new stocks we should buy

/**
 * Calculates simple averages of a stock's closing prices over a shorter and a longer time period
 * @param stockBars An array of bars for one stock
 * @returns An array with the short and long averages
 */
function calculateAverages(stockBars: AlpacaBar[]): number[] {
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

/**
 * Retrieves info on any stocks owned; used to determine if we should sell any
 * @returns Bars for all the stocks we own
 */
async function getPositionBars(): Promise<AlpacaBar[]> {
  // Get a list of stocks owned
  const positions = await alpaca.getPositions();
  console.log(positions);
  const positionSymbols = positions.map((p: any) => p.symbol);

  // Get price data for the stocks we own
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
  barsReceived.reverse(); // Changes the order to most recent -> oldest

  return barsReceived;
}

/**
 * Retrieves a list of stocks (listed on the NASDAQ and NYSE) that are affordable given a cash balance
 * @param cashBalance The amount of cash available to spend
 * @returns A list of affordable stock symbols
 */
async function getAffordableSymbols(cashBalance: number): Promise<string[]> {
  // Get a list of tradable stocks
  const allAssets = await alpaca.getAssets({ status: "active" });
  const allTradableAssets = allAssets.filter(
    (asset: any) =>
      ["nasdaq", "nyse"].includes(asset.exchange.toLowerCase()) &&
      asset.tradable
  );

  // Get the most recently traded price for each stock
  const allQuotes = await alpaca.getLatestQuotes(
    allTradableAssets.map((a: any) => a.symbol)
  );

  // Filter out the stocks that are too expensive for us
  const targetAssets = allQuotes
    .entries()
    .filter(([, quote]: [string, any]) => {
      return (
        quote.AskPrice < cashBalance / 10 || quote.BidPrice < cashBalance / 10
      );
    });

  // Filter out less frequently traded stocks
  const pastWeek = new Date();
  pastWeek.setDate(pastWeek.getDate() - 5);

  const recentTargetAssets = targetAssets.filter(
    ([, quote]: [string, any]) => new Date(quote.Timestamp) > pastWeek
  );

  return Array.from(
    recentTargetAssets.map(([symbol, quote]: [string, any]) => symbol)
  );
}
