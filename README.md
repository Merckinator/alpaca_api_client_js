# alpaca_api_client_js

Trade stocks on Alpaca using their Node.js library for their Alpaca Trade API.
The algorithm used is fairly simple; looks to buy stocks whose "short"-term
price average (of daily closing prices) just rose above that of a
"long(er)"-term and to sell if the opposite has happened. For reference, these
are called a "Golden Cross" and "Death Cross" patterns, most typically done with
50 and 200 days for the terms.

I had previously written a similar script in Python, but hadn't touched it in
some time and decided to try out their Node.js SDK instead.

To install dependencies:

```bash
deno install
```

To run locally (uses a `.env` file; specify `NODE_ENV=development` for Paper
trading):

```bash
deno task dev
```

## Notes

2/3/2025 - swapped to Deno to try it out (Railway supports it)

2/1/2025 - Deployed this in Railway to run on a cron schedule (`0 14 * * 1-5`, aka at
14:00, Monday through Friday)

- Pulls the Alpaca API key and secret from environment variables (set in Railway
  project for Live trading); for development purposes use a `.env` file for
  Paper trading; see "dev" Deno Task.

- Messages a Discord webhook for simple logging/notification to a personal
  Discord server (Discord Id and Token in environment variables).
