# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

n8n community node package for Enreach UP communication services. Provides webhook triggers and message operations (text, button, list, annotation) with optional JWT authentication.

## Commands

Package manager is pnpm. Build, lint and release go through `@n8n/node-cli` (`n8n-node`).

```bash
# Build (TypeScript + copy icons)
pnpm build

# Run n8n locally with the node, rebuilding on changes
pnpm dev

# Lint (n8n community-node rules, strict mode)
pnpm lint
pnpm lint:fix

# Test
pnpm test
pnpm test:watch
pnpm test:coverage

# Run single test file
pnpm exec jest --config tests/jest.config.js tests/utils/JwtValidator.test.ts

# Release: bump version, changelog, tag and push (does not publish)
pnpm release
```

Publishing to npm happens only in GitHub Actions (`.github/workflows/publish.yml`), on a version tag, with npm provenance. `prepublishOnly` blocks a direct `npm publish`.

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
`n8n-node build` compiles TypeScript to `dist/` and copies static files (SVG/PNG icons) keeping the folder structure. Icons have a light and a dark variant (`enreach.svg`, `enreach.dark.svg`).

## Testing

Tests are in `tests/utils/` using Jest with ts-jest. The `@/` path alias maps to project root. Coverage threshold is 60% for branches, functions, lines, and statements. `.node.ts` files are excluded from coverage collection (only utilities and credentials are covered).

## Linting

`eslint.config.mjs` re-exports the default config from `@n8n/node-cli/eslint`. `package.json` sets `n8n.strict: true` (n8n Cloud eligibility), so `n8n-node lint` rejects any change to that config. The n8n scanner disallows inline `eslint-disable` in published code; test files may use it.

### Verification constraints
- No runtime `dependencies`. Imports limited to `n8n-workflow`, `crypto` and relative paths.
- No `process.env` or file system access.
- Throw `NodeOperationError`/`NodeApiError` inside `catch` blocks, never raw errors.
- Credentials are tested through `testedBy: 'enreachCredentialTest'` on both nodes (`nodes/utils/credentialTest.ts`), since the JWT secret has no remote endpoint to call.
- The action node declares no-op `webhookMethods`: its webhook is the Send and Wait resume URL (`restartWebhook`), which n8n never registers at activation.
- See `docs/n8n-verification-checklist.md` for the full procedure and status.

## n8n Integration

This is an n8n community node package. The `n8n` field in package.json registers:
- Credentials: `dist/credentials/EnreachApi.credentials.js`
- Nodes: `dist/nodes/Enreach/Enreach.node.js`, `dist/nodes/EnreachTrigger/EnreachTrigger.node.js`

Requires `n8n-workflow` as peer dependency. Node engine requires Node.js >= 20.15.
