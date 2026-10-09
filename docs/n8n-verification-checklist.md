# n8n verified community node: procedure and compliance audit

Date: 2026-10-01 · Package: `n8n-nodes-enreach` 1.0.2 · Audited commit: `43c068f` (main)

## 1. Procedure (sources: docs.n8n.io "Submit community nodes", "Verification guidelines", n8n-io/n8n `scan-community-package` and `eslint-plugin-community-nodes`)

1. Name: `n8n-nodes-*` or `@scope/n8n-nodes-*`, keyword `n8n-community-node-package`, nodes and credentials registered in `package.json > n8n`.
2. Tooling: build and check with `@n8n/node-cli` (`n8n-node`), version >= 0.23.0 as a devDependency (provenance flag).
3. Rules from the verification guidelines:
   - one third-party service per package; no duplicate of an existing node; no Logic/Flow-control nodes;
   - a trigger for the same service may ship with the main node;
   - license MIT;
   - zero runtime `dependencies` (peer `n8n-workflow` allowed);
   - no env var access, no file system access;
   - English only (UI and docs);
   - README with usage and authentication;
   - public GitHub repo whose URL matches the npm `repository` field, and author/maintainer consistent between npm and the repo.
4. Scanner: `npx @n8n/scan-community-package n8n-nodes-xxx` must pass. It also checks the npm provenance attestation, so it only works on a published package. n8n re-scans every published version of a verified node.
5. Publish via GitHub Actions with npm provenance (mandatory since 2026-05-01; no local `npm publish`). Use the `publish.yml` from n8n-nodes-starter, with npm Trusted Publisher set up (npmjs.com > package > Publish access > Trusted Publishers > GitHub Actions: owner, repo, workflow file name).
6. Submit in the n8n Creator Portal. n8n may reject nodes that compete with paid features.
7. Allowed imports in the scanner (`no-restricted-imports`): `n8n-workflow`, `crypto`/`node:crypto`, lodash, moment, luxon, zod, p-limit and relative paths. Other scanner rules include `no-restricted-globals`, `no-dangerous-functions`, `credential-test-required`, `require-node-api-error`, `missing-paired-item`, `valid-author`, `require-homepage`, `no-forbidden-lifecycle-scripts`, `no-console`.

## 2. Compliance checklist

Legend: OK = verified in the repo; KO = non-compliant; ? = unverified (reason given).

| # | Point | Status | Evidence / action |
|---|---|---|---|
| 1 | Name `n8n-nodes-*` | OK | `n8n-nodes-enreach` |
| 2 | Keyword `n8n-community-node-package` | OK | package.json |
| 3 | `n8n` attribute (nodes and credentials) | OK | package.json:46-54 |
| 4 | License MIT | OK | `LICENSE.md` and `license` field |
| 5 | No runtime `dependencies` | OK | none declared |
| 6 | Imports within the allowlist | OK | only `n8n-workflow` and `crypto` (JwtValidator.ts) |
| 7 | No env var or file access | OK | grep `process.env`, `fs`, `child_process`, `eval`: no hits in nodes/credentials |
| 8 | English UI and docs | OK | README, displayNames in English |
| 9 | README with usage and auth | OK | README.md (could add screenshots and a link to the API docs) |
| 10 | One service per package, trigger allowed | OK | Enreach UP action node plus trigger |
| 11 | `@n8n/node-cli` >= 0.23.0 as devDependency | KO | absent. Add it and align scripts (`n8n-node build/lint/release`) |
| 12 | Linting through the n8n-node config | ? | The repo uses a legacy `.eslintrc.js` with `eslint-plugin-n8n-nodes-base`. `n8n-node lint` printed only its header (exit 0) on a copy, so the result is not conclusive. Migrate to the node-cli default config and re-run. |
| 13 | Publish from GitHub Actions with provenance | KO | no `.github/`; CI is GitLab (`.gitlab-ci.yml`, builds a Docker image). Add `.github/workflows/publish.yml` and a Trusted Publisher. |
| 14 | Public GitHub repo, URL matches npm `repository` | KO | package.json `repository`/`homepage`/`bugs` point to the private GitLab. The git remote is `github.com/enreachsp/n8n-nodes`. Check that this repo is public and update the three fields. |
| 15 | Author/maintainer consistent with npm | ? | `author: {name: "Enreach"}` has no email/url. Commits are by individuals. Check the `valid-author` rule and the owner of the npm account. |
| 16 | npm name available | KO/? | `npm view n8n-nodes-enreach` returns 404 "Unpublished on 2025-10-21". The name was unpublished. Check that republishing is allowed, and use a version above 1.0.2 (versions that were published stay burned). |
| 17 | Lockfile in repo | KO | none (no `package-lock.json` or `pnpm-lock.yaml`). Required for `pnpm install --frozen-lockfile` and reproducible CI. |
| 18 | Tests green | KO | `pnpm run test`: 89 tests pass, but `EnreachUtils.test.ts` fails to compile (TS2345 `jest.fn<any>()` at lines 437, 522, 664). The suite counts as red, and `prepublishOnly` fails. |
| 19 | Build | OK | `tsc` and gulp pass on a clean copy |
| 20 | Credential `test` and `authenticate` | KO (likely) | `EnreachApi.credentials.ts` has no `test`. The plugin rule `credential-test-required` exists. Credentials only hold an HMAC secret used for incoming validation, so there is no API call to test. Options: justify it, or add a `test` if an endpoint exists. To confirm with the scanner. |
| 21 | Credential icon / `documentationUrl` | OK | `icon` and `documentationUrl` present. Check the themed variant (`icon-prefer-themed-variants`) and the SVG with `icon-validation`. |
| 22 | `pairedItem` | OK | present (Enreach.node.ts:533, EnreachUtils.ts:463/489) |
| 23 | Error handling through `NodeApiError`/`NodeOperationError` | ? | `EnreachNodeError` extends `NodeOperationError`. The HTTP call at EnreachUtils.ts:257 may need `NodeApiError` (`require-node-api-error`). |
| 24 | Node metadata (`usableAsTool`, categories, version) | ? | `usableAsTool: true` is set on the action node only. Check `node-usable-as-tool`, `valid-node-categories`, `trigger-node-conventions`, `webhook-lifecycle-complete` with the scanner. |
| 25 | `files`, `homepage`, `.npmignore` | OK | `files: ["dist"]`. `.npmignore` is redundant but harmless. |
| 26 | Docs in docs/ | ? | `docs/index.md` mentions WhatsApp and the "Istra proxy API". Check it matches the README and avoid internal names. |
| 27 | Scanner `npx @n8n/scan-community-package` | ? | cannot run before the first provenance publish. Run it right after the first release from GitHub Actions. |
| 28 | Duplicate / competing node | ? | to check on the n8n integrations catalog and with n8n (Enreach is a communication service; check that no existing node covers it). |

## 3. Recommended order of work

1. Decide the public repo (GitHub `enreachsp/n8n-nodes`, public) and fix `repository`/`homepage`/`bugs`, `author` (name + email/url).
2. Add `@n8n/node-cli` >= 0.23.0, migrate lint/build/release scripts, add the lockfile (pnpm).
3. Fix the broken test compile (lines 437, 522, 664), re-run build, lint and tests.
4. Resolve the credential `test` point and the scanner-rule points (items 20, 23, 24).
5. Add `.github/workflows/publish.yml`, set up the npm Trusted Publisher, check the unpublished name, bump to 1.0.3 or higher, release.
6. Run `npx @n8n/scan-community-package n8n-nodes-enreach`, fix findings, then submit in the Creator Portal.

## 4. Progress (2026-10-01, branch `chore/n8n-verification`, not committed)

The table in section 2 describes commit `43c068f`. State after the work on this branch:

| # | Point | Status now |
|---|---|---|
| 11 | `@n8n/node-cli` | Done: 0.50.4, scripts use `n8n-node`, `n8n.strict: true` |
| 12 | Lint | Done: `pnpm lint` clean on all tracked files (see note below) |
| 13 | GitHub Actions publish with provenance | Workflow written (`.github/workflows/publish.yml`, `ci.yml`). Never run. npm Trusted Publisher not configured. |
| 14 | `repository`/`homepage`/`bugs` | Done: `github.com/enreachsp/n8n-nodes` (public, verified with `gh repo view`) |
| 15 | `author` | Done: E4SP, dev.sp@enreach.com. Must match the npm account that owns the package. |
| 16 | npm name unpublished on 2025-10-21 | Open. Check republish rights; first release must be above 1.0.2. |
| 17 | Lockfile | Done: `pnpm-lock.yaml`, `packageManager: pnpm@10.8.1` |
| 18 | Tests | Done: 6 suites, 146 tests |
| 20 | Credential test | Done through `testedBy` (local check: secret not empty). To confirm with the scanner. |
| 21 | Themed icons | Done: `enreach.dark.svg` (white fill, default choice, not design-reviewed) |
| 23 | Errors in `catch` | Done |
| 24 | `webhook-lifecycle-complete` | Done: no-op `webhookMethods` on the action node. n8n skips `restartWebhook` webhooks at activation (`webhook-trigger-registrar.ts`, `ignoreRestartWebhooks = true`). |
| 27 | Scanner | Open: needs a first published version with provenance |
| 28 | Duplicate / competing node | Open |

Also done: `.gitlab-ci.yml`, `Dockerfile`, `gulpfile.js`, `.eslintrc*`, `.npmignore` removed; `tsconfig.tsbuildinfo` moved out of `dist` (package 432 kB to 100 kB unpacked).

Note: locally, `pnpm lint` reports one error on `.remember/tmp/last-ndc.ts`, an untracked session file. It does not exist in CI.

Next exact action: commit, push the branch, open the PR, check that `ci.yml` is green. Then configure the npm Trusted Publisher (owner `enreachsp`, repo `n8n-nodes`, workflow `publish.yml`) and release.
