import type { AlpacaBar } from "@alpacahq/alpaca-trade-api/dist/resources/datav2/entityv2";
import type { Averages } from "./interfaces";

const Alpaca = require("@alpacahq/alpaca-trade-api");

const alpaca = new Alpaca({
  keyId: process.env.APCA_API_KEY_ID,
  secretKey: process.env.APCA_API_SECRET_KEY,
  paper: process.env.NODE_ENV === "development",
});

// // Main function
try {
  const scriptStartTime = new Date();

  // SECTION: Check if any stocks we own should be sold
  const positionSymbols = await getPositionSymbols();
  const positionBars = await getBars(positionSymbols);
  const positionAverages = positionBars.map(barsToAverages);
  const symbolsToSell = positionAverages.filter(
    (a) =>
      a.shortAverages[0] <= a.longAverages[0] &&
      a.shortAverages[1] > a.longAverages[1]
  );

  // SECTION: Sell any stocks we should sell
  symbolsToSell.forEach((a) => {
    sendNotification(`Selling: ${a.symbol}`);
    alpaca.createOrder({
      symbol: a.symbol,
      qty: 1,
      side: "sell",
      type: "market",
      time_in_force: "day",
    });
  });

  // SECTION: Find new stocks to buy
  const account = await alpaca.getAccount();
  const cash = account.cash;
  const affordableSymbols = await getAffordableSymbols(cash);
  const affordableBars = await getBars(affordableSymbols);
  const affordableAverages = affordableBars
    .map(barsToAverages)
    .filter((a) => a.symbol !== "NO_DATA");

  // Want to buy stocks where the short average just rose above the long average.
  // This is a bullish signal that the stock is likely starting to rise in price.
  const buyableAverages = affordableAverages.filter(
    (a) =>
      a.shortAverages[0] > a.longAverages[0] &&
      a.shortAverages[1] <= a.longAverages[1]
  );

  // SECTION: Buy a new stock that we identified at random from our list of buyable stocks
  const symbolToBuy =
    buyableAverages[Math.floor(Math.random() * buyableAverages.length)].symbol;
  sendNotification(`Buying: ${symbolToBuy}`);

  alpaca.createOrder({
    symbol: symbolToBuy,
    qty: 1,
    side: "buy",
    type: "market",
    time_in_force: "day",
  });

  // SECTION: Closing statements
  const scriptEndTime = new Date();
  sendNotification(
    `Script runtime (ms): ${
      scriptEndTime.getMilliseconds() - scriptStartTime.getMilliseconds()
    }`
  );
} catch (err) {
  console.error(err);
  sendNotification(String(err));
}

/**
 * Translates Bars into Averages for a given stock
 * @param bars An array of stock bars for one stock
 * @returns The Averages for the stock
 */
function barsToAverages(bars: AlpacaBar[]): Averages {
  if (bars.length < 1) {
    return {
      symbol: "NO_DATA",
      shortAverages: [0, 0],
      longAverages: [0, 0],
    };
  } else {
    const [shortAverages, longAverages] = calculateAverages(bars);

    return { symbol: bars[0].Symbol, shortAverages, longAverages };
  }
}

/**
 * Calculates the 2 most recent moving averages of stock closing prices over a shorter and a longer time period
 * @param stockBars An array of bars for one stock
 * @returns An array of arrays of the short and long averages
 */
function calculateAverages(stockBars: AlpacaBar[]): number[][] {
  const daysInShortAverage = 30;
  const daysInLongAverage = 100;

  let [shortAverage1, shortAverage2] = [0, 0];
  let [longAverage1, longAverage2] = [0, 0];

  const closingPrices = stockBars.map((bar) => bar.ClosePrice);

  if (stockBars.length >= 31) {
    const shortSum1 = closingPrices
      .slice(0, daysInShortAverage)
      .reduce((x, y) => x + y);

    const shortSum2 = closingPrices
      .slice(1, daysInShortAverage)
      .reduce((x, y) => x + y);

    shortAverage1 = shortSum1 / daysInShortAverage;
    shortAverage2 = shortSum2 / daysInShortAverage;
  }

  if (stockBars.length >= 101) {
    const longSum1 = closingPrices
      .slice(0, daysInLongAverage)
      .reduce((x, y) => x + y);

    const longSum2 = closingPrices
      .slice(1, daysInLongAverage)
      .reduce((x, y) => x + y);

    longAverage1 = longSum1 / daysInLongAverage;
    longAverage2 = longSum2 / daysInLongAverage;
  }

  return [
    [shortAverage1, shortAverage2],
    [longAverage1, longAverage2],
  ];
}

/**
 * Gets Bars (details) for multiple stocks
 * @param symbols An array of stock symbols
 * @returns An array of arrays of bars for each stock, each in recent -> oldest order
 */
async function getBars(symbols: string[]): Promise<AlpacaBar[][]> {
  // Get price data for the stocks we own
  const daysToFetch = 151;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToFetch);

  const bars = alpaca.getMultiBarsAsyncV2(symbols, {
    start: startDate.toISOString().slice(0, 10),
    timeframe: alpaca.newTimeframe(1, alpaca.timeframeUnit.DAY),
    limit: daysToFetch * symbols.length,
  });
  const barsReceived: AlpacaBar[] = [];
  for await (let b of bars) {
    barsReceived.push(b);
  }
  barsReceived.reverse(); // Changes the order to most recent -> oldest

  const symbolBars: AlpacaBar[][] = [];
  symbols.forEach((symbol) => {
    symbolBars.push(barsReceived.filter((b) => b.Symbol === symbol));
  });
  return symbolBars;
}

/**
 * Retrieves info on any stocks owned; used to determine if we should sell any
 * @returns Bars for all the stocks we own
 */
async function getPositionSymbols(): Promise<string[]> {
  // Get a list of stocks owned
  const positions = await alpaca.getPositions();
  console.log(positions);

  return positions.map((p: any) => p.symbol);
}

/**
 * Retrieves a list of stocks (listed on the NASDAQ and NYSE) that are "affordable" given a cash balance
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
      return quote.AskPrice < cashBalance || quote.BidPrice < cashBalance;
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

function sendNotification(message: string) {
  const discordId = process.env.DISCORD_ID;
  const discordToken = process.env.DISCORD_TOKEN;
  const discordWebhookUrl = `https://discordapp.com/api/webhooks/${discordId}/${discordToken}`;

  const payload = {
    content: message,
    username: "Alpaca-TS-Script",
    avatar_url:
      "https://d1qb2nb5cznatu.cloudfront.net/startups/i/638844-fc9b06d417a209c9e53f71809af92091-medium_jpg.jpg?buster=1516408319",
  };
  console.log("Sending notification:", payload.content);

  fetch(discordWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
