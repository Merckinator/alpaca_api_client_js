import {
  barsToAverages,
  getBars,
  getTradableSymbols,
  sendNotification,
} from "./functions.ts";

import Alpaca from "npm:@alpacahq/alpaca-trade-api";
import { Averages, Position } from "./interfaces.ts";

const alpaca = new Alpaca({
  keyId: Deno.env.get("APCA_API_KEY_ID"),
  secretKey: Deno.env.get("APCA_API_SECRET_KEY"),
  paper: Deno.env.get("NODE_ENV") === "development",
});

// // Main function
try {
  const scriptStartTime = new Date();

  // SECTION: Check if any stocks we own should be sold
  const positions = await alpaca.getPositions();
  const positionBars = await getBars(
    alpaca,
    positions.map((position: Position) => position.symbol),
  );
  const positionAverages = positionBars.map(barsToAverages);
  console.log("positionAverages", positionAverages);

  const symbolsToSell = positionAverages.filter(
    (a) => a.shortAverages[0] <= a.longAverages[0],
  );
  console.log("symbols to sell:", symbolsToSell);

  // SECTION: Sell any stocks we should sell
  if (symbolsToSell.length > 0) {
    symbolsToSell.forEach((a) => {
      sendNotification(`Selling: ${a.symbol}`);
      const amountToSell = positions.find(
        (position: Position) => position.symbol === a.symbol,
      )?.qty;

      if (amountToSell) {
        alpaca.createOrder({
          symbol: a.symbol,
          qty: amountToSell,
          side: "sell",
          type: "market",
          time_in_force: "day",
        });
      }
    });
  }

  // SECTION: Find new stocks to buy
  const account = await alpaca.getAccount();
  const cash = account.cash;
  console.log("cash:", cash);

  const tradableSymbols = await getTradableSymbols(alpaca);
  console.log("count of tradable symbols:", tradableSymbols.length);

  let buyableAverages: Averages[] = [];

  // Process the stocks in chunks to avoid choking on too much data at once
  while (buyableAverages.length === 0 && tradableSymbols.length > 0) {
    // Script was choking in development on > 6k symbols, so we'll try limiting it to 100
    const limitedSymbols = tradableSymbols.splice(0, 100);

    const affordableBars = await getBars(alpaca, limitedSymbols);
    const affordableAverages = affordableBars
      .map(barsToAverages)
      .filter((a) => a.symbol !== "NO_DATA");
    console.log("count of affordable averages:", affordableAverages.length);

    // Want to buy stocks where the short average just rose above the long average.
    // This is a bullish signal that the stock is likely starting to rise in price.
    buyableAverages = affordableAverages.filter(
      (a) =>
        a.shortAverages[0] > a.longAverages[0] &&
        a.shortAverages[1] <= a.longAverages[1],
    );
    console.log("count of buyable averages:", buyableAverages.length);
  }

  // SECTION: Buy a new stock that we identified at random from our list of buyable stocks
  const amountToSpend = Math.floor(cash / 7);
  console.log("amountToSpend:", amountToSpend);

  if (amountToSpend > 0 && buyableAverages.length > 0) {
    const symbolToBuy =
      buyableAverages[Math.floor(Math.random() * buyableAverages.length)]
        .symbol;
    sendNotification(`Buying: ${symbolToBuy}`);

    alpaca.createOrder({
      symbol: symbolToBuy,
      notional: amountToSpend.toString(),
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
