console.log("Hello via Bun!");

const Alpaca = require("@alpacahq/alpaca-trade-api");

const alpaca = new Alpaca({
  keyId: process.env.APCA_API_KEY_ID,
  secretKey: process.env.APCA_API_SECRET_KEY,
  paper: true,
});

// Get all the stocks we own
const positions = await alpaca.getPositions();
console.log(positions);

// Determine if we should sell any of our stocks

// Sell any stocks we should sell

// Determine if we should buy any new stocks

// Buy any new stocks we should buy
