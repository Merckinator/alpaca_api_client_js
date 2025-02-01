# alpaca_api_client_js

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.0. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Notes

Just (2/1/2025) deployed this in Railway to run on a cron schedule (`0 14 * * 1-5`, aka at 14:00, Monday through Friday).

- Pulls the Alpaca API key and secret from environment variables (set in Railway project for Live trading); for development purposes one can just make/use a `.env` file, e.g. `.env.local` for Paper trading.
- Messages a Discord webhook for simple logging/notification to a personal Discord server (Discord Id and Token in environment variables).
