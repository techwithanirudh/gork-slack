# Gork Slack

A human-like bot (called Gork) that is almost indistinguishable from a real person. This is a port of the original Gork for Discord to Slack.

## Project Overview

### Package Manager

Always use **bun** as the package manager. Never use npm, yarn, or pnpm.

```bash
bun install          # Install dependencies
bun add <pkg>        # Add a dependency
bun add -d <pkg>     # Add a dev dependency
bun remove <pkg>     # Remove a dependency
```

### Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run start` | Start production server |
| `bun run check` | Run linter checks |
| `bun run check:write` | Fix linting issues |
| `bun run check:unsafe` | Fix linting issues (including unsafe fixes) |
| `bun run check:spelling` | Check spelling |
| `bun run typecheck` | Run TypeScript type checking |

### Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **AI SDK**: Vercel AI SDK v5 with ai-retry for fallback
- **Slack**: @slack/bolt
- **Vector DB**: Pinecone (for memory/RAG)
- **Cache/Rate Limiting**: Redis
- **Linting/Formatting**: Ultracite (Biome)
- **Observability**: Langfuse + OpenTelemetry

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Bot User OAuth Token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Yes | Signing Secret from Basic Information |
| `SLACK_APP_TOKEN` | No | Socket Mode token (xapp-...) |
| `SLACK_SOCKET_MODE` | No | Enable socket mode (default: false) |
| `PORT` | No | HTTP port (default: 3000) |
| `AUTO_ADD_CHANNEL` | No | Channel to auto-add users who ping the bot |
| `OPT_IN_CHANNEL` | No | Required channel membership for bot usage |
| `REDIS_URL` | Yes | Redis connection string for rate limiting |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `HACKCLUB_API_KEY` | Yes | Hack Club AI proxy API key |
| `EXA_API_KEY` | Yes | Exa web search API key |
| `PINECONE_API_KEY` | Yes | Pinecone API key |
| `PINECONE_INDEX` | Yes | Pinecone index name |
| `LANGFUSE_SECRET_KEY` | No | Langfuse secret key for tracing |
| `LANGFUSE_PUBLIC_KEY` | No | Langfuse public key |
| `LANGFUSE_BASEURL` | No | Langfuse endpoint URL |
| `LOG_LEVEL` | No | Log level: debug, info, warn, error (default: info) |
| `LOG_DIRECTORY` | No | Directory for log files (default: logs) |

### Project Structure

```
server/
├── index.ts              # Entry point, starts Slack app
├── env.ts                # Environment variable validation (t3-env + zod)
├── config.ts             # Bot configuration (keywords, speed, memory limits)
├── lib/
│   ├── ai/
│   │   ├── providers.ts  # AI model configuration with fallback chains
│   │   ├── prompts/      # System prompts (personality, core, examples, tools)
│   │   ├── tools/        # AI tools (reply, react, skip, get-weather, etc.)
│   │   ├── memory/       # Memory text generation
│   │   └── utils.ts      # AI utilities
│   ├── pinecone/         # Vector database operations
│   ├── memory/           # Memory storage and retrieval
│   ├── validators/       # Response validators (SFW, probability)
│   ├── kv.ts             # Redis client and rate limiting
│   ├── logger.ts         # Pino logger configuration
│   └── allowed-users.ts  # User allowlist management
├── slack/
│   ├── app.ts            # Slack Bolt app initialization
│   ├── conversations.ts  # Conversation history fetching
│   └── events/
│       ├── index.ts      # Event registration
│       └── message-create/
│           ├── index.ts  # Message event handler
│           └── utils/
│               ├── respond.ts    # Response generation
│               └── relevance.ts  # Relevance assessment
├── types/                # TypeScript type definitions
└── utils/                # Utility functions (messages, users, time, etc.)
```

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

## Coding Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

### Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

### Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

#### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

#### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

#### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

#### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

#### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

#### Security

- Validate and sanitize user input
- Don't use `eval()` or assign directly to `document.cookie`
- All bot responses must be SFW - this is enforced at multiple levels

#### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)

### Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

### When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **Documentation** - Add comments for complex logic, but prefer self-documenting code

Most formatting and common issues are automatically fixed by Biome. Run `bun x ultracite fix` before committing to ensure compliance.
