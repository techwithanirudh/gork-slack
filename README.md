<h1 align="center">Gork (for Slack)</h4>

## 📋 Table of Contents

1. 🤖 [Introduction](#introduction)
2. 🚀 [Tech Stack](#tech-stack)
3. 📚 [Getting Started](#getting-started)
4. 🧠 [Memory](#memory)
5. 📝 [License](#license)

## <a name="introduction">🤖 Introduction</a>

A human-like bot (called Gork) that is almost indistinguishable from a real person. This is a port of the original [Gork for Discord](https://github.com/techwithanirudh/gork) to Slack.

## <a name="tech-stack">🚀 Tech Stack</a>

This project was developed with the following technologies:

- [Vercel AI SDK][ai-sdk]
- [Exa AI][exa]
- [Pinecone][pinecone]
- [Upstash][upstash]
- [Slack Bolt SDK][slack-bolt]
- [TypeScript][ts]
- [Bun][bun]
- [Biome][biome]

## <a name="getting-started">📚 Getting Started</a>

To clone and run this application, first you need to create a new [Slack App](https://api.slack.com/apps) with the [provided manifest](slack-manifest.json). Afterwards, you will need [Git][git] and [Bun][bun] installed on your computer.

From your command line:

```bash
# Clone this repository
$ git clone https://github.com/techwithanirudh/gork-slack.git

# Install dependencies
$ bun install
```

Next, copy the .env.example file, rename it to .env, and add your environment variables.
Great! Now you just need to start the development server.

```bash
# Start server
$ bun run dev
```

## <a name="memory">🧠 Memory</a>

This bot uses [Pinecone][pinecone] to store memory. You can set the `PINECONE_INDEX` environment variable to the name of your Pinecone index.

Set the `PINECONE_API_KEY` environment variable to your Pinecone API key.

Then, create a Pinecone index and set the `PINECONE_INDEX` environment variable to the name of your Pinecone index.

We use the `llama-text-embed-v2` integrated embedding option for our instances.

## <a name="license">📝 License</a>

This project is under the MIT license. See the [LICENSE](LICENSE) for details.

[git]: https://git-scm.com/
[node]: https://nodejs.org/
[ts]: https://www.typescriptlang.org/
[slack-bolt]: https://docs.slack.dev/tools/bolt-js/
[biome]: https://biomejs.dev/
[ai-sdk]: https://ai-sdk.dev/
[bun]: https://bun.sh/
[exa]: https://exa.ai/
[pinecone]: https://www.pinecone.io/
[upstash]: https://upstash.com/
