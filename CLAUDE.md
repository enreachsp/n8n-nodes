# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

n8n community node package for Enreach UP communication services. Provides webhook triggers and message operations (text, button, list, annotation) with optional JWT authentication.

## Commands

```bash
# Build (TypeScript + copy icons)
npm run build

# Development (watch mode)
npm run dev

# Lint (uses n8n-specific ESLint plugin rules)
npm run lint
npm run lintfix

# Test
npm run test
npm run test:watch
npm run test:coverage

# Run single test file
npx jest tests/utils/JwtValidator.test.ts
```

`prepublishOnly` runs both build and test before npm publish.

## Architecture

### Node Structure
- `nodes/Enreach/Enreach.node.ts` - Main action node with "Send and Wait" and "Send Message" operations. Has `usableAsTool: true` for n8n AI agent integration.
- `nodes/EnreachTrigger/EnreachTrigger.node.ts` - Webhook trigger node (version 2) that receives Enreach events via POST.
- `credentials/EnreachApi.credentials.ts` - JWT secret credential configuration (HMAC-SHA256).

### Utilities (`nodes/utils/`)
- `EnreachUtils.ts` - Core message processing: `processSendAndWait()`, `processSendMessage()`, `handleWebhook()`, message body building, validation
- `JwtValidator.ts` - JWT token validation with HMAC-SHA256 signature verification
- `webhookAuth.ts` - Shared webhook authentication logic used by both Trigger and main node
- `constants.ts` - Message limits, timeout configs, message types
- `errors.ts` - `EnreachNodeError` class extending `NodeOperationError` with error codes and user-friendly messages

### Key Patterns
- Enreach node auto-detects JWT and callback URL from connected trigger node via hidden fields with expression: `$($parameter.triggerNodeName).item.json`
- "Send and Wait" uses `putExecutionToWait()` for async webhook response handling, with `$execution.resumeUrl` as the callback
- The Enreach API uses `resumUrl` (without 'e') - this is intentional, not a typo
- Both JSON and manual mapping modes for button/list options. Manual mode uses `optionsManual` (list) and `optionsManualButton` (button) as separate fixedCollection parameters
- Validation enforces limits: 1024 chars text, 20 chars button title, 256 chars option ID, 3-10 list options

### JWT transport
- **Incoming webhooks**: JWT is read from the `X-Callback-Auth-Token` header first (case-insensitive, trimmed), with fallback to `bodyData.jwt` for backward compatibility. The resolved JWT is then exposed on the workflow output as `json.jwt` so existing expressions keep working. See `extractIncomingJwt()` in `EnreachUtils.ts`.
- **Outgoing requests** to `callbackUrl`: JWT is sent both as the `X-Callback-Auth-Token` header and inside the body (`messageBody.jwt`) — the body mirror is kept for backward compatibility during Enreach platform migration.

### Build Process
The gulpfile copies icon files (SVG/PNG) from `nodes/` and `credentials/` to `dist/` maintaining folder structure. TypeScript compiles to `dist/`.

## Testing

Tests are in `tests/utils/` using Jest with ts-jest. The `@/` path alias maps to project root. Coverage threshold is 60% for branches, functions, lines, and statements. `.node.ts` files are excluded from coverage collection (only utilities and credentials are covered).

## Linting

ESLint uses `eslint-plugin-n8n-nodes-base` with three override blocks:
- `package.json` → `plugin:n8n-nodes-base/community` rules
- `credentials/**/*.ts` → `plugin:n8n-nodes-base/credentials` rules
- `nodes/**/*.ts` → `plugin:n8n-nodes-base/nodes` rules

These enforce n8n-specific conventions (param naming, descriptions, class structure). A separate `.eslintrc.prepublish.js` config exists for stricter pre-publish checks.

## n8n Integration

This is an n8n community node package. The `n8n` field in package.json registers:
- Credentials: `dist/credentials/EnreachApi.credentials.js`
- Nodes: `dist/nodes/Enreach/Enreach.node.js`, `dist/nodes/EnreachTrigger/EnreachTrigger.node.js`

Requires `n8n-workflow` as peer dependency. Node engine requires Node.js >= 20.15.
