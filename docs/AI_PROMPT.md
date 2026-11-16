# Sezzle calculator take-home | Coding-agent prompt

You are the coding agent implementing my take-home assignment for Sezzle's Senior Software Engineer with Accounting Experience role. Build, test, document, and publish the solution in one run, using the supplied workspace and my authenticated GitHub access.

## 0. The assignment, priorities, and time budget

**Original assignment (what the reviewers will grade against):** a full-stack calculator with a React frontend and a backend REST microservice. The frontend consumes the backend API for basic operations (add, subtract, multiply, divide) and optional ones (exponentiation, square root, percentage). Reviewers look for clean, readable, idiomatic, maintainable and testable code; input validation and error handling on both layers; a responsive UI; unit tests for both layers with a coverage report; and documentation (setup, API usage, design rationale). A Dockerfile is optional. Deliverables: a Git repository, a README, tests plus a coverage report, the prompts used, and the repository link.

**Target effort is 2–4 hours.** Correctness, clarity and maintainability beat extra features. Work in this order and protect the earlier tiers if time runs short:

1. **Must have:** working calculator (all 7 operations), validated API, tests and coverage for both layers, README, repository, prompt files.
2. **Should have:** Dockerfile and GitHub Actions CI (including tests and coverage artifacts).
3. **Only with my approval (ask first, see section 1):** publishing the image to GitHub Container Registry, and any live deployment.

**Out of scope (do not add):** database, accounts, calculation history, memory keys, themes, internationalization, extra operations, UI kits, CSS frameworks, routers, state-management libraries, or decimal/big-number libraries.

**The finished app must satisfy two audiences:** the reviewer (every requirement below, verified) and a normal person who opens it and expects it to behave like a calculator they already know (section 5). Treat the human experience as a graded requirement, not polish.

## 1. Working with me (the environment owner)

I own this machine and GitHub account and am available to help. You are not expected to work around missing access. Ask me instead.

**Preflight (read-only, do this before writing code).** Check and record: OS and shell; `git` and its configured `user.name`/`user.email`; `go`; `node` and `npm`; `docker` (installed, and daemon running); `gh` and `gh auth status` (or another configured Git credential); whether a remote or existing assignment repository is configured; network access to GitHub, the Go module proxy and the npm registry; whether a browser or headless-browser tool is available for UI checks.

**Then send me ONE consolidated message** containing:

- **Missing items.** For each: what is missing, why it is needed, the exact command for me to run (note if it needs admin/sudo or an interactive login), and how you will verify it afterwards.
- **Decisions I must make** (offer a recommended default for each):
  1. Repository: use an existing one, or create `sezzle-calculator` under my account?
  2. Visibility: the reviewers need to read it. Public, or private plus an invite (and which reviewer GitHub username)? Default to private until I answer.
  3. May you publish the container image to GitHub Container Registry (tier 3)? If yes, should the package be made public afterwards (I would do that in the GitHub UI) or stay private?
  4. Is there an already-authorized live hosting target? If not, skip deployment.

**Do not stop and wait unnecessarily.** Keep building everything that does not depend on my answer, and use the recommended defaults if I have not answered when you reach the dependent step. If you cannot ask me at all (non-interactive run), proceed with the safe defaults (private repo, no publishing, no deployment) and list every outstanding step with its exact command in the final report.

**Rules of engagement:**

- Never run `sudo`, an admin/elevated command, a system-wide install, or anything that changes Docker/daemon/OS settings without telling me the exact command and getting my explicit OK. Prefer user-space installs and project-local dependencies, and tell me what you installed.
- I authenticate. Never ask me to paste a token or password into the chat. Ask me to run `gh auth login` (or equivalent) myself, then confirm with `gh auth status`. Never write secrets into files, remote URLs, shell history, logs, or workflow artifacts.
- Do not change global Git configuration (use repository-local config if an identity is missing and I approve a value). Do not force-push, rewrite published history, delete repositories, change repository settings or visibility, or invite collaborators without asking.
- Decide routine implementation details yourself and record material assumptions in the README. Only ask about things that cost real time, need my credentials, or have effects outside the workspace.
- Send a one-or-two-line progress note at the end of each phase (backend, frontend, tests, Docker/CI, docs, verification). Don't be chatty beyond that.
- If a failed command needs my help, say exactly what failed, the error line, and the fix you propose.

## 2. Stack and architecture

- **Frontend:** React, TypeScript, Vite, in `frontend/`. Runtime dependencies: `react` and `react-dom` only. Plain CSS.
- **Backend:** Go (latest stable release available to you, not older than 1.22) using only the standard library, in `backend/`. Declare the version in `go.mod`.
- **Node:** an active LTS release (22 or newer). Declare it in `.nvmrc` and `package.json` `engines`. Commit `package-lock.json`.
- One repository, no database, no accounts.
- Suggested layout (adjust if you have a better idiom):
  - `backend/cmd/server/` (startup, config, graceful shutdown)
  - `backend/internal/calc/` (pure arithmetic, no HTTP imports)
  - `backend/internal/api/` (handlers, request validation, error mapping)
  - `frontend/src/api/` (HTTP client only)
  - `frontend/src/calculator/` (pure state reducer and number formatting, no React or fetch inside)
  - `frontend/src/components/` (presentation only)
- Make the API client injectable so component tests can mock it without patching globals.
- Backend config: `PORT` (default `8080`), `STATIC_DIR` (folder with the built frontend; if unset or missing, serve the API only). Vite dev server on `5173` proxies `/api` to `http://localhost:8080`. The packaged app is same-origin, so the browser uses the same relative path `/api/v1/calculate` everywhere.

## 3. Calculation rules

Use Go `float64` and JSON numbers.

| Operation | API id | Behavior |
| --- | --- | --- |
| Addition | `add` | `a + b` |
| Subtraction | `subtract` | `a - b` |
| Multiplication | `multiply` | `a * b` |
| Division | `divide` | `a / b`; error if `b == 0` |
| Exponentiation | `power` | `a` to the power `b` |
| Square root | `sqrt` | `√a`; unary; error if `a < 0` |
| Percentage | `percent` | `a` percent of `b` (15 percent of 200 is 30) |

Edge-case policy (implement exactly, test every line, document in README):

- `0^0` returns `1` (IEEE 754 / Go `math.Pow` convention). Say so in the README.
- `0` to a negative power: error `undefined_result`.
- Negative base with a non-integer exponent (for example `(-8)^(1/3)`): error `undefined_result`. A negative base with an integer exponent is valid (`(-2)^3 = -8`).
- Any result that is `±Inf` or `NaN`: reject. Overflow gives `result_out_of_range`; a mathematically undefined result gives `undefined_result`. Underflow to zero is accepted; note it in the README.
- Percentage: compute `a * b / 100`. If `a * b` overflows to infinity but `a / 100 * b` is finite, return the latter (so `50% of 1.7e308` works). If the final result is not finite, reject it.
- The API returns the full-precision `float64` unchanged (`0.1 + 0.2` returns `0.30000000000000004`). Rounding for humans happens only in the frontend display (section 5).

## 4. REST API contract

`POST /api/v1/calculate`

- Binary: `{"operation":"percent","a":15,"b":200}` returns HTTP 200 `{"result":30}`.
- Unary: `{"operation":"sqrt","a":81}` (omit `b`) returns `{"result":9}`.
- Responses use `Content-Type: application/json; charset=utf-8` and `Cache-Control: no-store`.

Errors always look like `{"error":{"code":"division_by_zero","message":"Cannot divide by zero."}}`. Use exactly these codes and statuses, and document them in the README:

| Status | `code` | When |
| --- | --- | --- |
| 400 | `invalid_json` | Empty body, malformed JSON, or extra data after the first JSON value |
| 400 | `invalid_request` | Valid JSON of the wrong shape: not an object, unknown fields, `operation` not a string |
| 400 | `unknown_operation` | `operation` missing or not one of the seven identifiers |
| 400 | `missing_operand` | A required operand is absent (absent is different from `0`) |
| 400 | `invalid_operand` | Operand is `null`, a string/boolean/array/object, or a number outside `float64` range (for example `1e999`) |
| 400 | `unexpected_operand` | `b` supplied (even `null`) for `sqrt` |
| 405 | `method_not_allowed` | Any method other than POST on the route; send `Allow: POST` and a JSON error body |
| 413 | `request_too_large` | Body over 4 KiB (use `http.MaxBytesReader`) |
| 422 | `division_by_zero` | `divide` with `b == 0` |
| 422 | `negative_square_root` | `sqrt` of a negative number |
| 422 | `undefined_result` | `0^negative`, negative base with non-integer exponent, or other `NaN` |
| 422 | `result_out_of_range` | Result is infinite |

Implementation hints: decode operands as `json.RawMessage` (or `json.Number`) so you can tell absent from `null` from `0` from a string, then parse with `strconv.ParseFloat` and treat a range error as `invalid_operand`. Use `json.Decoder` with `DisallowUnknownFields`, and confirm there is no trailing data after the first object. Keep handlers thin: parse, validate, call `calc`, map typed errors to codes.

`GET /healthz` returns 200 `{"status":"ok"}`.

Server hygiene: `http.Server` with `ReadHeaderTimeout` and sensible timeouts, graceful shutdown on SIGINT/SIGTERM, request logging that never logs secrets. When `STATIC_DIR` is set, serve the built frontend at `/`; unknown `/api/...` paths return a JSON 404 rather than the HTML page.

## 5. Frontend: a calculator people already know how to use

The UI must feel like the pocket or phone calculator every user has used before, not like a data-entry form. Build a single-screen calculator with a display and a keypad. Every calculation still goes through the Go API; the frontend never does the arithmetic itself.

**Layout.** An expression line (small text, for example `15 % of 200`) above a large result/entry display, then a 4-column grid of large native `<button>` keys. Suggested layout:

```
  C    ⌫    √    ÷
  7    8    9    ×
  4    5    6    −
  1    2    3    +
  ±    0    .    =
```

Add `xʸ` (power) and `% of` as two clearly labeled operator keys (an extra row or column is fine) so every operation is visible without scrolling. Make the percentage key read as an operator: after pressing `15`, `% of`, `200`, the expression line shows `15 % of 200`, so it is always obvious which number is the percentage and which is the base.

**Behavior (match ordinary basic calculators).**

- Typing a number: digits and one decimal point; no leading-zero clutter (`007` becomes `7`, `.5` shows `0.5`); `±` toggles sign; `⌫` deletes the last character; `C` clears everything. Limit entry length (about 16 digits) so the display never breaks.
- Binary operators (`+ − × ÷ xʸ % of`): store the first number and the operator. Pressing another operator before typing the second number replaces the operator. Pressing an operator after a complete second number first evaluates the pending operation through the API, then continues with that result (left-to-right chaining, no operator precedence, like a pocket calculator; say so in the README).
- `=` evaluates the pending operation. With an incomplete expression it does nothing and sends no request.
- `√` is unary: it applies to the number currently shown, sends one operand (no `b`), and shows the result immediately.
- After a result: typing a digit starts a new number; pressing an operator continues from the result. `⌫` on a result does nothing.
- Pending state: while a request is in flight, show "Calculating…", disable the keys that would change or resubmit the calculation (no duplicate requests), and keep `C` available. `C` during a request cancels it (`AbortController`) and any late response is ignored and never displayed. Add a request timeout (about 10 seconds).
- Errors: show the API's `message` in a visible alert area near the display, keep the expression visible so the user sees what failed, and clear the error on the next key press. Handle unexpected or malformed responses and network failure with plain-language messages (for example "Can't reach the calculator service. Check that the backend is running and try again.").
- Physical keyboard: digits, `.`, `+ - * /`, `^` (power), `%` (percent of), `Enter` or `=` (equals), `Backspace`, `Escape` or `c` (clear). Pressing `Enter` on a focused keypad button must still activate that button natively; `Enter` anywhere else means equals. Pointer and touch use must not trap keyboard users.
- Paste: pasting a valid number (for example from a spreadsheet) fills the current entry. Anything that is not a valid decimal number (blank, text, `Infinity`, hex, non-finite) is rejected with a short message (for example "That isn't a valid number") and no request is made. A final guard before every API call must verify both operands are finite numbers.

**Display formatting (consistent everywhere).** Keep the exact value from the API as the internal operand, but show a human-friendly rendering: round to at most 12 significant digits and strip trailing zeros (so `0.30000000000000004` shows `0.3`), show `-0` as `0`, avoid scientific notation for ordinary values, and use exponent notation (for example `1.5e+21`) for very large or very small ones. Long values must not overflow or scroll the page (shrink the font or scroll inside the display).

**Accessibility and responsiveness.** Native controls with accessible names (`aria-label="divide"`, "square root", "percent of", "backspace", and so on); visible focus indicator; WCAG AA contrast; touch targets of at least 44×44 px; the result announced through an `aria-live="polite"` region and errors through `role="alert"`; respect `prefers-reduced-motion`. Verify at a desktop width and a 360 px mobile width with no horizontal page scroll.

**Human acceptance walk-through (you must run these in a real browser against the real Go service, or, if no browser is available, give me this checklist to perform):**

| Input | Expected |
| --- | --- |
| `12` `+` `7` `=` | `19` |
| `0.1` `+` `0.2` `=` | `0.3` |
| `15` `% of` `200` `=` | `30`, expression line reads `15 % of 200` |
| `81` `√` | `9` |
| `2` `xʸ` `10` `=` | `1024` |
| `5` `÷` `0` `=` | Visible "Cannot divide by zero." message from the server |
| `2` `+` `3` `×` `4` `=` | `20` (left-to-right, as documented) |
| `0` `xʸ` `0` `=` | `1`, as documented |
| `0` `xʸ` `±` `1` `=` | `undefined_result` message shown clearly |
| Stop the backend, press `=` | Plain-language network error, UI stays usable |

## 6. Tests and coverage

**Go (standard `testing`, table-driven):**

- `calc`: all seven operations with negative, zero, decimal, domain and overflow cases; `0^0`; `0^-1`; `(-8)^(1/3)`; `(-2)^3`; `sqrt(-1)`; percent with a large input that would overflow if multiplied first (for example `50` percent of `1.7e308`) and one that truly overflows.
- `api` with `httptest`: success for binary and unary; every error code in the table; missing versus `null` versus `0` operands; string/boolean/array operands; `1e999`; extra `b` on `sqrt`; malformed JSON; trailing JSON after the object; unknown fields; unknown operation; oversize body; 405 with `Allow: POST`; `/healthz`; the division-by-zero response body exactly.

**Frontend (Vitest + React Testing Library, mocked API client):**

- Reducer and formatter unit tests: leading zeros, decimal handling, sign toggle, backspace, operator replacement, chaining, result then digit, float display cleanup, `-0`, very large/small values.
- Component tests: a full keypad calculation shows the API result and sends the right request body; `√` sends only `a`; `% of` sends `a=15, b=200` and shows `15 % of 200`; incomplete `=` makes no request; invalid paste rejected with no request; API error code displayed; network failure displayed; pending disables keys and prevents duplicate requests; `C` during a pending request prevents the late response from showing; keyboard shortcuts work.
- A separate smoke test (script run in CI and locally) verifies the real frontend-to-backend path: UI served, a static asset referenced by the HTML served, `/healthz`, and a real calculation.

**Coverage:**

- Go: `go test ./... -covermode=atomic -coverprofile=coverage.out`, then `go tool cover -func=coverage.out` and `go tool cover -html=coverage.out -o coverage.html`.
- Frontend: Vitest with `@vitest/coverage-v8` (reporters: text-summary, html, lcov, json-summary), exposed as `npm run test:coverage`.
- Report the measured Go statement coverage and frontend line and branch coverage. Do not set arbitrary thresholds or invent numbers. Add generated coverage output to `.gitignore`.

## 7. Docker and GitHub Actions

**Docker (tier 2).** Root multi-stage `Dockerfile` and `.dockerignore`: stage 1 builds the React app (`npm ci`, `npm run build`); stage 2 builds a static Go binary (`CGO_ENABLED=0`); the final image is minimal, runs as a non-root user, copies the binary and the frontend build, sets `STATIC_DIR`, exposes `8080`, and serves UI and API from the one Go server. Verify the built image by requesting the UI, a static asset the HTML references, `/healthz`, and a real calculation from the running container.

**CI (tier 2).** `.github/workflows/ci.yml`, triggered on pull requests and pushes to `main` (adapt to the repository's default branch). Use current major versions of the official actions, `go-version-file: backend/go.mod`, `node-version-file: .nvmrc`, `npm ci`, npm caching, and `permissions: contents: read` at workflow level. Steps: `gofmt -l` check (fail if it prints anything), `go vet`, Go tests with coverage, frontend lint, type check, tests with coverage, build of both layers, upload of both coverage reports as artifacts (`actions/upload-artifact`), then build the Docker image and run the smoke test against the container.

**Publishing (tier 3, only if I approved it).** A separate job that runs only on pushes to `main`, after all CI jobs pass (`needs:`), with only `contents: read` and `packages: write`, using the built-in `GITHUB_TOKEN`. Push to `ghcr.io/<owner>/<repo>` tagged with the full commit SHA (a `latest` tag is optional). Publish the image that was tested (pass it between jobs as an artifact) or, if that is awkward, rebuild from the same commit with the same Dockerfile. Verify the pull and run commands you document. If the package is private, pulling needs `docker login ghcr.io` with a token that has `read:packages`; tell me exactly how (I create the token, you never see it), and tell me the manual step for making the package public if I asked for that.

**Live deployment:** only if I confirmed an already-authorized runtime. Otherwise state clearly that no running demo exists.

## 8. Repository, README, and prompts

**Repository.** Use the existing assignment repository if one is configured; otherwise create the one agreed in section 1. Follow the configured Git identity. Use small, meaningful commits (not one giant commit). Add a `.gitignore` covering `node_modules`, `dist`, coverage output, Go binaries, `.env` and editor files. Never commit generated output, secrets, or local configuration. Push to the default branch (`main`).

**README (root `README.md`).** The reader is someone with a **brand-new computer with nothing installed**. Write it plain and simple: short sentences, numbered steps, no unexplained jargon, each command in its own code block with the output they should expect. Put the "get it running" parts first and the technical depth below, in this order:

1. **What this is** (two sentences) and a screenshot or short description of the UI.
2. **Get the code.** Either `git clone <url>` (with a link to install Git) or "Download ZIP" on the GitHub page. Mention that a private repository needs access.
3. **Fastest way: run with Docker.** Install Docker Desktop (link to the official download page; macOS, Windows, Linux), start it, then `docker build -t sezzle-calculator .` and `docker run --rm -p 8080:8080 sezzle-calculator`, then open `http://localhost:8080`. How to stop it.
4. **Run from source (no Docker).** Install Go and Node.js (official links, the exact tested versions, and the command to confirm each, such as `go version` and `node --version`). Terminal 1: start the backend with exact commands and port. Terminal 2: `npm ci`, `npm run dev`. Open `http://localhost:5173`. Say which terminal the user is in (PowerShell on Windows, Terminal on macOS/Linux).
5. **Using the calculator.** The keys, keyboard shortcuts, and "works left to right like a pocket calculator."
6. **Run the tests and see coverage.** Exact commands for both layers and where the HTML reports appear; the measured coverage numbers (Go statements; frontend lines and branches).
7. **API reference.** Endpoint, request/response shapes, the full error-code table, and `curl` examples with expected output: one binary request, one square-root request, one error request. Because `curl` quoting differs on Windows, also give the PowerShell form (`Invoke-RestMethod`) for at least the first example.
8. **Design decisions and assumptions.** Architecture and why the arithmetic, HTTP, API-client and state logic are separated; server-side validation; percentage meaning (`a` percent of `b`); chaining without precedence; `0^0 = 1` and the other edge-case policies; why the keypad UI.
9. **Numeric precision.** `float64` and rounding (`0.1 + 0.2`), what the display rounds versus what the API returns, and why `float64` is not suitable for exact monetary arithmetic (recommend integer minor units or a decimal type, with string-encoded amounts, for real money).
10. **CI, container registry and (if any) live demo.** The CI description, the exact `docker pull` and `docker run` commands for the published image (if published), and an explicit statement of whether a running demo exists.
11. **Troubleshooting.** Port already in use, Docker not running, wrong Node/Go version.
12. **AI prompts.** Link to `docs/AI_PROMPT.md` and `docs/AI_PROMPTS.md`.

Do not put commit SHAs or Actions run links in the README (they go stale); those go in your final report.

**Prompts.** Commit this exact prompt, verbatim and in full (the text of this message from the first heading to the end), as `docs/AI_PROMPT.md`. Record any other prompts used during the work, including follow-ups used to fix problems, in `docs/AI_PROMPTS.md`. If you cannot recover an exact prompt, say what is missing so I can attach it. Keep credentials and unrelated private content out of the repository.

## 9. Final verification and handoff

Before finishing:

1. Clone the pushed repository into a clean temporary directory and follow the README literally, copying each command as written. Fix any step that does not work. State honestly what you could not reproduce from a truly fresh machine (for example installing Go or Docker).
2. Run the human acceptance walk-through from section 5 in a real browser against the real Go service, confirm the network request and response for a calculation, and exercise a server-side error. Check the layout at desktop and 360 px widths.
3. Inspect the GitHub Actions runs for the pushed commit, fix recoverable failures, and rerun. Confirm the commit that CI tested (and published, if applicable) is the commit at the head of `main`.
4. Confirm the repository contains no generated build output, coverage output, secrets or local configuration.

**Final report to me (be explicit about what you actually ran versus what you could not verify):**

- Repository URL and the pushed commit SHA
- Links to the Actions run and the coverage artifacts
- Image reference and pull command (if published), and whether a live demo exists (and its URL if so)
- Measured coverage: Go statements; frontend lines and branches
- Path of the committed prompt: `docs/AI_PROMPT.md`
- Checks run, checks not run, and why
- Outstanding items for me, each with the exact command or step (access invitations, package visibility, anything that needed credentials or admin rights)
