<h1 align="center">Gork (for Slack)</h4>

## 📋 Table of Contents

1. 🤖 [Introduction](#introduction)
2. 🚀 [Tech Stack](#tech-stack)
3. 📚 [Getting Started](#getting-started)
4. 🐳 [Running with Docker](#running-with-docker)
5. 🧠 [Memory](#memory)
6. 📝 [License](#license)

## <a name="introduction">🤖 Introduction</a>

A human-like bot (called Gork) that is almost indistinguishable from a real person. This is a port of the original [Gork for Discord](https://github.com/techwithanirudh/gork) to Slack.

## <a name="tech-stack">🚀 Tech Stack</a>

This project was developed with the following technologies:

- [Vercel AI SDK][ai-sdk]
- [Exa AI][exa]
- [Pinecone][pinecone]
- [Redis][redis]
- [Slack Bolt SDK][slack-bolt]
- [TypeScript][ts]
- [Bun][bun]
- [Biome][biome]

## <a name="getting-started">📚 Getting Started</a>

First, create a new [Slack App](https://api.slack.com/apps) using the [provided manifest](slack-manifest.json). You will also need [Git][git], [Bun][bun], and a running [Redis][redis] instance.

```bash
# Clone this repository
$ git clone https://github.com/techwithanirudh/gork-slack.git

# Install dependencies
$ bun install

# Copy and fill in your environment variables
$ cp .env.example .env
```

```bash
# Start in development (watch mode)
$ bun run dev

# Start in production
$ bun run start
```

## <a name="running-with-docker">🐳 Running with Docker</a>

Docker bundles the bot and Redis together, no separate Redis setup needed.

```bash
# Clone and enter the repo
$ git clone https://github.com/techwithanirudh/gork-slack.git && cd gork-slack

# Copy and fill in your environment variables
$ cp .env.example .env

# Build and start
$ docker compose up -d

# View logs
$ docker compose logs -f gork

# Stop
$ docker compose down
```

> **Note:** When running with Docker, set `REDIS_URL=redis://redis:6379` in your `.env`.

## <a name="memory">🧠 Memory</a>

This bot uses [Pinecone][pinecone] to store memory. You can set the `PINECONE_INDEX` environment variable to the name of your Pinecone index.

Set the `PINECONE_API_KEY` environment variable to your Pinecone API key.

Then, create a Pinecone index and set the `PINECONE_INDEX` environment variable to the name of your Pinecone index.

We use the `llama-text-embed-v2` integrated embedding option for our instances.

## <a name="license">📝 License</a>

This project is under the MIT license. See the [LICENSE](LICENSE) for details.

[git]: https://git-scm.com/
[ts]: https://www.typescriptlang.org/
[slack-bolt]: https://docs.slack.dev/tools/bolt-js/
[biome]: https://biomejs.dev/
[ai-sdk]: https://ai-sdk.dev/
[bun]: https://bun.sh/
[exa]: https://exa.ai/
[pinecone]: https://www.pinecone.io/
[redis]: https://redis.io/
