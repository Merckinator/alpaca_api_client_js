const Alpaca = require("@alpacahq/alpaca-trade-api");

const alpaca = new Alpaca({
  keyId: process.env.APCA_API_KEY_ID,
  secretKey: process.env.APCA_API_SECRET_KEY,
  paper: true,
});

// Get all the stocks we own
const positions = await alpaca.getPositions();
console.log(positions);
const positionSymbols = positions.map((p: any) => p.symbol);

// Determine if we should sell any of our stocks
const daysToFetch = 5;
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
console.log(barsReceived);

// Sell any stocks we should sell

// Determine if we should buy any new stocks

// Buy any new stocks we should buy
