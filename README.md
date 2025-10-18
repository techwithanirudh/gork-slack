# AI SDK Slack Chatbot

This project is a Slack Bolt chatbot powered by the [Vercel AI SDK](https://sdk.vercel.ai/docs). It listens for direct messages and mentions in Slack, keeps conversational context within threads, and replies in-character using large language models.

## Features

- Built on [@slack/bolt](https://slack.dev/bolt-js) with support for both Socket Mode and HTTP receivers
- Uses the Vercel AI SDK so you can swap LLM providers without rewriting business logic
- Maintains context within direct messages and public channel threads
- Includes example tools such as real-time weather lookup
- Opinionated personality prompt for "Zenix" that can be customized easily

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- Slack workspace with permissions to install custom apps
- `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET`
- Optional: `SLACK_APP_TOKEN` if you prefer Socket Mode
- Optional: `OPENAI_API_KEY`, `HACKCLUB_API_KEY`, `OPENROUTER_API_KEY` depending on which AI provider you enable

## Environment Variables

Create a `.env` file (or configure your secrets in your host) with at least:

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Optional
SLACK_APP_TOKEN=xapp-...
SLACK_SOCKET_MODE=true        # set to "true" to use Socket Mode
OPENAI_API_KEY=...
HACKCLUB_API_KEY=...
OPENROUTER_API_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
LOG_DIRECTORY=logs
LOG_LEVEL=info
MEM0_API_KEY=m0-...
```

## Slack App Setup (summary)

1. Visit [api.slack.com/apps](https://api.slack.com/apps) and create a new app.
2. Under **Basic Information**, copy the Signing Secret.
3. Under **OAuth & Permissions**, add the bot scopes:
   - `app_mentions:read`
   - `chat:write`
   - `im:history`
   - `im:read`
   - `im:write`
4. Install the app to your workspace and copy the Bot User OAuth token.
5. If you deploy with HTTP events, enable **Event Subscriptions** and point the Request URL to your deployment (e.g. `https://your-domain.com/slack/events`). Subscribe to `app_mention` and `message.im`.
6. If you prefer Socket Mode, create an App-Level Token with the `connections:write` scope and set `SLACK_SOCKET_MODE=true`.

## Development

```bash
npm install
npm run dev
```

The development command runs the Bolt app with `tsx` and watches for file changes. Socket Mode is the easiest option locally—set `SLACK_SOCKET_MODE=true` and provide `SLACK_APP_TOKEN`.

To build the project:

```bash
npm run build
```

Compiled JavaScript is emitted to `dist/`. Start the compiled build with `npm start`.

## Deployment

The bundled Bolt app is a plain Node.js process. Any platform that can run Node (Fly.io, Render, Railway, Vercel functions, etc.) will work. For serverless platforms make sure you use Socket Mode or provide an HTTP entrypoint and route Slack requests to the process.

## Customisation

- Modify the persona prompt in `server/utils/generate-response.ts`.
- Adjust keyword detection or rate limits in `server/config.ts` and `server/lib/kv.ts`.
- Extend `server/slack/events/message.ts` to handle more event types.
- Add new tools for the LLM inside `server/utils/generate-response.ts` or create new utility modules.

## License

MIT
