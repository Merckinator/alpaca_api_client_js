import { Averages, Bar } from "./interfaces.ts";

/**
 * Translates Bars into Averages for a given stock
 * @param bars An array of stock bars for one stock
 * @returns The Averages for the stock
 */
export function barsToAverages(bars: Bar[]): Averages {
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
export function calculateAverages(stockBars: Bar[]): number[][] {
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
export async function getBars(
  alpaca: any,
  symbols: string[],
): Promise<Bar[][]> {
  // Get price data for the stocks we own
  const daysToFetch = 151;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToFetch);

  const bars = alpaca.getMultiBarsAsyncV2(symbols, {
    start: startDate.toISOString().slice(0, 10),
    timeframe: alpaca.newTimeframe(1, alpaca.timeframeUnit.DAY),
    limit: daysToFetch * symbols.length,
  });
  const barsReceived: Bar[] = [];
  for await (const b of bars) {
    barsReceived.push(b);
  }
  barsReceived.reverse(); // Changes the order to most recent -> oldest

  const symbolBars: Bar[][] = [];
  symbols.forEach((symbol) => {
    symbolBars.push(barsReceived.filter((b) => b.Symbol === symbol));
  });
  return symbolBars;
}

// Get a list of tradable stocks
export async function getTradableSymbols(alpaca: any): Promise<string[]> {
  const nasdaqAssets: any[] = await alpaca.getAssets({
    exchange: "NASDAQ",
    status: "active",
  });
  const nyseAssets: any[] = await alpaca.getAssets({
    exchange: "NYSE",
    status: "active",
  });
  const allTradableAssets = nasdaqAssets.concat(nyseAssets).filter(
    (asset: any) =>
      asset.tradable &&
      // these other flags are just to help filter out uncommon stocks
      asset.easy_to_borrow &&
      asset.fractionable &&
      asset.marginable &&
      asset.shortable,
  );

  return allTradableAssets.map((a: any) => a.symbol);
}

/**
 * Retrieves a list of stocks (listed on the NASDAQ and NYSE) that are "affordable" given a cash balance
 * @param cashBalance The amount of cash available to spend
 * @returns A list of affordable stock symbols
 */
export async function getAffordableSymbols(
  alpaca: any,
  cashBalance: number,
  tradableSymbols: string[],
): Promise<string[]> {
  // Get a quote for each stock
  const allQuotes = await alpaca.getLatestQuotes(tradableSymbols);

  // Filter out the stocks that are too expensive for us
  const targetAssets = allQuotes
    .entries()
    .filter(([_a, quote]: [string, any]) => {
      return quote.AskPrice < cashBalance || quote.BidPrice < cashBalance;
    });

  // Filter out less frequently traded stocks
  const pastWeek = new Date();
  pastWeek.setDate(pastWeek.getDate() - 5);

  const recentTargetAssets = targetAssets.filter(
    ([_a, quote]: [string, any]) => new Date(quote.Timestamp) > pastWeek,
  );

  return Array.from(
    recentTargetAssets.map(([symbol, _quote]: [string, any]) => symbol),
  );
}

export function sendNotification(message: string) {
  const discordId = Deno.env.get("DISCORD_ID");
  const discordToken = Deno.env.get("DISCORD_TOKEN");
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
