# Gork Slack

A human-like Slack bot almost indistinguishable from a real person.

## Package Manager

Always use **bun**. Never use npm, yarn, or pnpm.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run start` | Start production server |
| `bun run check` | Run linter checks |
| `bun run check:write` | Fix linting issues |
| `bun run check:spelling` | Check spelling |
| `bun run typecheck` | Run TypeScript type checking |

## Tech Stack

- **Runtime**: Bun / TypeScript
- **Slack**: @slack/bolt
- **AI**: Vercel AI SDK v5 with ai-retry fallback
- **Vector DB**: Pinecone (memory/RAG)
- **Cache / Rate Limiting**: Redis
- **Linting / Formatting**: Ultracite (Biome)
- **Observability**: Langfuse + OpenTelemetry

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Bot User OAuth Token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Yes | Signing Secret from Basic Information |
| `SLACK_APP_TOKEN` | No | Socket Mode token (xapp-...) |
| `SLACK_SOCKET_MODE` | No | Enable socket mode (default: false) |
| `PORT` | No | HTTP port (default: 3000) |
| `AUTO_ADD_CHANNEL` | No | Channel to auto-add users who ping the bot |
| `OPT_IN_CHANNEL` | No | Required channel membership for bot usage |
| `REDIS_URL` | Yes | Redis connection string |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `HACKCLUB_API_KEY` | Yes | Hack Club AI proxy API key |
| `EXA_API_KEY` | Yes | Exa web search API key |
| `PINECONE_API_KEY` | Yes | Pinecone API key |
| `PINECONE_INDEX` | Yes | Pinecone index name |
| `LANGFUSE_SECRET_KEY` | No | Langfuse secret key |
| `LANGFUSE_PUBLIC_KEY` | No | Langfuse public key |
| `LANGFUSE_BASEURL` | No | Langfuse endpoint URL |
| `LOG_LEVEL` | No | debug / info / warn / error (default: info) |
| `LOG_DIRECTORY` | No | Directory for log files (default: logs) |


## Adding a New `/gork` Subcommand

When adding a new subcommand (e.g. `/gork foo`), you must update **all** of the following or the command will be invisible in help:

1. **Implementation** — add `server/slack/commands/foo.ts` (or `server/slack/features/<feature>/commands/foo.ts` if part of a feature)
2. **Help constant** — add `server/constants/help/foo.ts` and re-export it from `server/constants/help/index.ts`
3. **Help command** — in `server/slack/commands/help.ts`, add the constant to the `commands` array and to the `z.enum([...])` in `parseCommandArgs`
4. **Router** — in `server/slack/commands/handler.ts`, import and add the handler to the `subcommands` array

## How Gork Works

### Trigger System

Gork responds to messages based on triggers:

1. **Direct Ping** (`ping`): User mentions `@Gork` directly
2. **DM** (`dm`): User sends a direct message
3. **Keyword** (`keyword`): Message contains "gork" or "grok"
4. **Relevance** (`relevance`): AI determines the message is worth responding to

### Response Flow

1. Message received → check rate limits
2. Determine trigger type (ping/DM/keyword/relevance)
3. If no explicit trigger, assess relevance using AI
4. Build context (recent messages, user hints, memories from Pinecone)
5. Generate response using AI with tools
6. Save conversation to memory (Pinecone)

### AI Tools

| Tool | Description |
|------|-------------|
| `reply` | Send a message reply |
| `react` | Add emoji reaction to a message |
| `skip` | Decide not to respond |
| `leave-channel` | Leave the current channel |
| `get-weather` | Get weather information |
| `get-user-info` | Get Slack user profile info |
| `search-memories` | Search past conversations in Pinecone |

### AI Model Configuration

Models are configured in `server/lib/ai/providers.ts` using ai-retry for automatic fallback:

- **chat-model**: Primary conversation model (Gemini 3 Flash → Gemini 2.5 Flash → GPT-5 Mini)
- **relevance-model**: Fast model for relevance assessment
- **content-filter-model**: Lightweight model for content filtering

### Personality

Gork's personality is defined in `server/lib/ai/prompts/personality.ts`:
- Lazy, sarcastic, and funny
- Gives intentionally wrong answers to serious questions
- Minimal punctuation, shitposter style
- Always SFW (strictly enforced)

### Rate Limiting

- Per-channel rate limits via Redis
- Message quota system (threshold defined in `config.ts`)
- Prevents spam and controls API costs
