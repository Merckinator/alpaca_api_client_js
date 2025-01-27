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

WIP - Currently working on this.

- Pulls the Alpaca API key and secret from environment variables; eventually these will be set in a project on Railway.com (where I'll be hosting it), but for development purposes one can just make/use a `.env` file, e.g. `.env.local`.
- Eventually will have it message a Discord webhook for a simple logging/notification setup.
