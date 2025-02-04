import {
  barsToAverages,
  getAffordableSymbols,
  getBars,
  getPositionSymbols,
  sendNotification,
} from "./functions.ts";

import Alpaca from "npm:@alpacahq/alpaca-trade-api";

const alpaca = new Alpaca({
  keyId: Deno.env.get("APCA_API_KEY_ID"),
  secretKey: Deno.env.get("APCA_API_SECRET_KEY"),
  paper: Deno.env.get("NODE_ENV") === "development",
});

// // Main function
try {
  const scriptStartTime = new Date();

  // SECTION: Check if any stocks we own should be sold
  const positionSymbols = await getPositionSymbols(alpaca);
  const positionBars = await getBars(alpaca, positionSymbols);
  const positionAverages = positionBars.map(barsToAverages);
  const symbolsToSell = positionAverages.filter(
    (a) => a.shortAverages[0] <= a.longAverages[0],
  );
  console.log("symbols to sell:", symbolsToSell);

  // SECTION: Sell any stocks we should sell
  if (symbolsToSell.length > 0) {
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
  }

  // SECTION: Find new stocks to buy
  const account = await alpaca.getAccount();
  const cash = account.cash;
  console.log("cash:", cash);

  const affordableSymbols = await getAffordableSymbols(alpaca, cash);
  console.log("count of affordable symbols:", affordableSymbols.length);

  const affordableBars = await getBars(alpaca, affordableSymbols);
  const affordableAverages = affordableBars
    .map(barsToAverages)
    .filter((a) => a.symbol !== "NO_DATA");
  console.log("count of affordable averages:", affordableAverages.length);

  // Want to buy stocks where the short average just rose above the long average.
  // This is a bullish signal that the stock is likely starting to rise in price.
  const buyableAverages = affordableAverages.filter(
    (a) =>
      a.shortAverages[0] > a.longAverages[0] &&
      a.shortAverages[1] <= a.longAverages[1],
  );
  console.log("count of buyable averages:", buyableAverages.length);

  // SECTION: Buy a new stock that we identified at random from our list of buyable stocks
  if (buyableAverages.length > 0) {
    const symbolToBuy =
      buyableAverages[Math.floor(Math.random() * buyableAverages.length)]
        .symbol;
    sendNotification(`Buying: ${symbolToBuy}`);

    alpaca.createOrder({
      symbol: symbolToBuy,
      qty: 1,
      side: "buy",
      type: "market",
      time_in_force: "day",
    });
  }

  // SECTION: Closing statements
  const scriptEndTime = new Date();
  sendNotification(
    `Script runtime (ms): ${
      scriptEndTime.getMilliseconds() - scriptStartTime.getMilliseconds()
    }`,
  );
} catch (err) {
  console.error(err);
  sendNotification(String(err));
}
