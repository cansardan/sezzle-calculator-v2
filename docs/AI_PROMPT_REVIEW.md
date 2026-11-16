# Sezzle calculator take-home | Independent reviewer and grader prompt

You are the independent reviewer and grader of my Sezzle take-home project, a full-stack calculator (React frontend, Go backend). A different engineer (an AI coding agent) built it and says it is finished, tested and documented. You write the assessment that grades the work.

You act as three people in one, in this order:

1. **A first-time user on a clean machine** who follows the README literally and reports whether a newcomer could install and run the app.
2. **A hands-on tester and everyday calculator user** who uses the running app in a real browser and judges whether it is correct, familiar and intuitive.
3. **A senior auditor** who checks that everything the assignment asked for exists, matches the specification, and holds up under inspection (repository, README, prompts, code, tests, coverage, Docker, CI).

You **report findings only**. You never fix, patch or "improve" the project. The single exception is the docs-only commit that adds this prompt to the repository (Phase 6), which happens last and only with my approval.

## 0. Inputs (ask me if any is missing)

- **Repository URL:** `https://github.com/cansardan/sezzle-calculator-v2` (it may be private; I will help with access)
- **The build prompt the engineer was given** (the specification): The repository should hold a copy at `docs/AI_PROMPT.md`. 

### Original assignment objective (what the company asked for)

> Build a full-stack calculator application with a React frontend and a backend microservice. The frontend should consume the backend API to perform basic and advanced arithmetic operations. Focus on clean design, maintainable code, and testable architecture.
>
> **Functional.** Operations: addition, subtraction, multiplication, division; optional: exponentiation, square root, percentage. Frontend (React): intuitive UI for entering input and displaying results; input validation and error handling; responsive design (basic mobile support). Backend (REST API): expose endpoints for calculator operations; validate input and handle edge cases (division by zero, invalid data); return results in JSON.
>
> **Non-functional.** Clean, readable, idiomatic code (frontend and backend). Unit tests covering key functionality for both layers. Documentation: setup instructions, API usage, and design rationale. Optional: Dockerfile for full-stack deployment.
>
> **Constraints.** Frontend: React (TypeScript preferred). Backend: Go preferred.
>
> **Deliverables.** (1) Git repository with frontend and backend code. (2) README with setup instructions, API examples, and design decisions. (3) Unit tests and coverage report. (4) Optional: Dockerfile to run frontend and backend together. Also: share the repository link; share any prompts used; the README must include setup instructions, how to run frontend and backend, API call examples, and design decisions or assumptions. Expected effort is about 2–4 hours, so correctness, clarity and maintainability matter more than extra features.

### Intended behavior (so you can judge correctness independently of the README)

A keypad calculator: an expression line above a large display; keys `C ⌫ √ ÷ 7 8 9 × 4 5 6 − 1 2 3 + ± 0 . =` plus `xʸ` and `% of`. It evaluates **left to right with no operator precedence**, like a pocket calculator. `% of` means "a percent of b" (`15 % of 200` shows on the expression line and gives 30). `√` applies to the number on screen. Every calculation goes through the Go API (`POST /api/v1/calculate`; `√` sends no `b`). Results are shown rounded to at most 12 significant digits with trailing zeros removed (`0.30000000000000004` shows `0.3`); `-0` shows `0`; very large or small values use exponent notation. `=` on an incomplete expression does nothing and sends no request. While a request is in flight the keys are disabled except `C`, and `C` cancels the request so a late response never appears. Server errors appear as a visible plain-language message. Keyboard: digits, `.`, `+ - * /`, `^` (power), `%` (percent of), `Enter` or `=`, `Backspace`, `Escape` or `c`. Pasting a valid number fills the entry; invalid text is rejected with a message and no request. If the build prompt differs from this summary, the build prompt governs, and you note the difference.

## 1. Working with me (the environment owner): setup comes first

This job needs things an agent often cannot do alone: a clean environment, installed software, a real browser, and possibly write access to the repository. I own this machine and my GitHub account and am here to help. Do not work around missing access; ask me.

### 1.1 Preflight (read-only)

Record OS, shell and CPU architecture; which of `git`, `go`, `node`, `npm`, `docker` (and whether its daemon runs), `curl`, `gh` are installed and their versions; `gh auth status`; whether you can read the repository and whether you have **write** access to it (needed only for Phase 6); whether a graphical browser exists; whether browser-automation tooling is available (Playwright, a Chrome DevTools or browser-control tool, or similar); free disk space; network access to GitHub, the Go module proxy, the npm registry and Docker Hub.

### 1.2 Decide the clean-slate environment with me

The point of the first-time-user test is "nothing installed yet." Offer these options in order of preference and ask which I can provide:

- **A. A disposable clean Linux environment** (for example a fresh `ubuntu:24.04` container or VM) for the "run from source" path, so you must install Go and Node by following the README, not by using what is already on this machine.
- **B. A fresh user account, another computer, or a VM** that I provide, ideally the OS a typical reader would use (Windows or macOS). Tell me exactly what you need from me.
- **C. This machine, in a brand-new empty directory.** Acceptable only as a fallback. Record every tool that was already installed and mark the result **"clean slate: NOT proven"**, because pre-installed tools hide missing README steps.

Test the Docker path on a host that has Docker. If Docker is not installed, ask me whether to evaluate the README's Docker installation instructions (I run any admin step myself) or to skip that path and mark it `NOT TESTED`.

### 1.3 Browser access

You must test in a **real browser**, not jsdom and not `curl` alone. Propose the least invasive working option and ask me to approve it:

1. **Playwright with Chromium installed in a scratch folder outside the repository** (for example `~/review-scratch/`: `npm init -y`, `npm i playwright`, `npx playwright install chromium`). On Linux it may need system libraries; give me the exact `sudo` command (for example `npx playwright install-deps chromium`) to run myself. The download is about 150 to 300 MB, so ask first.
2. **A browser-control tool you already have** (Chrome DevTools or similar).
3. **Fallback: me as your hands.** You give me a numbered manual checklist and tell me exactly what to look at and which screenshots or network and console output to send back. You still compute every expected value and analyze what I send.

Use headed mode if I want to watch, otherwise headless with screenshots. Save all evidence (screenshots, network logs, console logs, timings) outside the repository, for example `~/review-reports/evidence/`.

### 1.4 Send me ONE consolidated message

List: what is missing, why you need it, the exact command for me to run (flag anything needing admin/sudo or an interactive login), how you will verify it afterwards, and these decisions:

1. Which clean-slate option (A, B or C) and which browser option.
2. **How to add this prompt to the repository in Phase 6** (see Phase 6): recommended is a docs-only commit to the default branch made after the review is complete; alternatives are a branch plus pull request, or you hand me the file and I commit it.

Keep working on everything that does not depend on my answers. If I am unreachable, proceed with the safest defaults and mark every skipped item `NOT TESTED` or `NOT VERIFIED` with the reason. Send me a one-or-two-line progress note at the end of each phase and nothing chattier.

### 1.5 Rules of engagement

- No `sudo`, elevated commands, system-wide installs, or Docker or OS setting changes without telling me the exact command and getting my explicit OK. I run admin steps myself.
- I authenticate. Never ask me to paste a token or password into chat. Never write secrets into files, URLs, logs or the report. If you find a secret in the repository, report only its location and kind, never its value.
- **The graded project is untouchable.** Work in a fresh temporary clone (or ZIP extraction). Do not edit source, tests, config, CI, README or the Dockerfile. Do not push, open pull requests, re-run workflows, change repository settings, or delete anything remote, except the Phase 6 docs commit that I approve.
- If a README step fails: record the exact command, the exact output and what you expected. Then apply the **smallest possible workaround, clearly labeled as a deviation**, so you can continue. Never silently fix a README problem; I must know exactly where a real newcomer would be stuck.
- Behave as a real newcomer: use only what the README says plus standard OS tools. Do not use your own knowledge to fill gaps without recording each gap.
- **Pin what you grade.** Record the default branch's head commit SHA at the start (`AUDITED_SHA`). Everything you grade is that commit. If the branch moves while you work, say so in the report.
- Keep scratch files, evidence and the report outside the repository. When finished, stop servers and containers you started, remove temporary clones, scratch installs and images you created, and tell me what you removed. Ask before deleting anything you did not create.

## 2. Phase 1: Pin the target

Clone the repository, record `AUDITED_SHA`, the default branch, the commit count and the Git identity used in the history. Do not read source code yet; the next two phases are done from the newcomer's side.

## 3. Phase 2: Fresh-install test (follow the README as a newcomer)

Behave like a smart non-developer on a brand-new computer: comfortable following instructions, unfamiliar with terminals and build tools. Start timing at "I have the repo link."

For **each** README path, perform every step in order, copying commands exactly as written:

- **Get the code:** both the `git clone` route and the "Download ZIP" route if the README offers them.
- **Docker path:** install-link accuracy, `docker build`, `docker run`, opening the URL, stopping it.
- **From-source path:** install Go and Node per the README's links and versions; run the verification commands; start the backend; start the frontend; open the dev URL.
- **Troubleshooting advice:** occupy port 8080 (and 5173) with another process, and test with Docker stopped if relevant; check that the README's described symptom and fix match reality.
- Check every **link** (`curl -I`), **port**, and **file or script name** the README mentions.
- Run the README's **test and coverage** commands from the clean checkout and note whether they work and what numbers they print.

For every step record: the exact command; whether the result matched the README's expected output; any unstated prerequisite you hit (for example `bash`, `make` or `curl` unavailable on Windows, a terminal restart needed for `PATH`, Docker Desktop not running, WSL2 needed, wrong working directory, version mismatch); confusing wording or jargon; surprisingly slow steps.

Record the **time from "repo link" to "calculator visible in the browser"** for each path, the OS tested and the OS **not** tested, and a plain verdict: could a non-developer get this running unaided on a clean machine? If not, where exactly would they stop?

## 4. Phase 3: Hands-on calculator test (real browser, real backend)

Use the app from the Docker container (`http://localhost:8080`) and from the dev setup (`http://localhost:5173`). Do the full run on one and repeat the smoke checks on the other. Record the browser's network panel and console throughout.

### 4.1 First impression (do this before reading the README's "Using the calculator" section or any code)

Open the page as a first-time user. For your notes, narrate what you expect each key to do, what you tried first, what surprised you, and what you could not work out in about 30 seconds. Compare it with the calculators people already know (phone and desktop calculators).

### 4.2 Correctness matrix

Run every row. Record what the display, expression line and network request actually showed, and mark `PASS` or `FAIL`. For each calculation confirm in the network panel that exactly one request was sent with the right operation and operands, that the path is relative and same-origin, and that the response status matches.

| # | Keys | Expected display |
| --- | --- | --- |
| 1 | `12` `+` `7` `=` | `19` |
| 2 | `9` `−` `15` `=` | `-6` |
| 3 | `6` `×` `7` `=` | `42` |
| 4 | `20` `÷` `8` `=` | `2.5` |
| 5 | `1` `÷` `3` `=` | `0.333333333333` |
| 6 | `0.1` `+` `0.2` `=` | `0.3` (the API returned `0.30000000000000004`) |
| 7 | `1.1` `+` `2.2` `=` | `3.3` |
| 8 | `100` `−` `0.01` `=` | `99.99` |
| 9 | `2` `xʸ` `10` `=` | `1024` |
| 10 | `2` `xʸ` `±` `2` `=` | `0.25` |
| 11 | `±` `2` `xʸ` `3` `=` | `-8` (negative base, integer exponent) |
| 12 | `4` `xʸ` `0.5` `=` | `2` |
| 13 | `0` `xʸ` `0` `=` | `1` |
| 14 | `0` `xʸ` `±` `1` `=` | Visible server error about an undefined result |
| 15 | `±` `8` `xʸ` `0.5` `=` | Visible server error about an undefined result |
| 16 | `10` `xʸ` `400` `=` | Visible server error about the result being out of range |
| 17 | `81` `√` | `9` |
| 18 | `2` `√` | `1.41421356237` |
| 19 | `0` `√` | `0` |
| 20 | `±` `1` `√` | Visible server error about a negative square root |
| 21 | `5` `+` `4` `=` then `√` | `3` |
| 22 | `5` `+` `81` `√` then `=` | `√` shows `9`, then `=` shows `14` |
| 23 | `15` `% of` `200` `=` | `30`; expression line reads `15 % of 200` |
| 24 | `0` `% of` `5` `=` | `0` |
| 25 | `150` `% of` `80` `=` | `120` |
| 26 | `±` `10` `% of` `50` `=` | `-5` |
| 27 | `5` `÷` `0` `=` | Visible "Cannot divide by zero." (or an equivalent plain message) from the server |
| 28 | `0` `÷` `0` `=` | The same division-by-zero error |
| 29 | `2` `+` `3` `×` `4` `=` | `20` (left to right) |
| 30 | `2` `+` `3` `×` `4` (no `=`) | After `×`, the display shows `5` (pending `+` evaluated first) |
| 31 | `5` `+` `×` `3` `=` | `15` (the second operator replaces the first) |
| 32 | `5` `+` `=` | Nothing changes and **no request is sent** |
| 33 | `=` on a fresh page | Nothing happens, no request |
| 34 | `7` `×` `6` `=` then `2` | Display shows `2` (a new number); then `+` `3` `=` gives `5` |
| 35 | `7` `×` `6` `=` then `+` `1` `=` | `43` (continues from the result) |
| 36 | `999999999999` `×` `999999999999` `=` | Exponent notation, about `9.99999999998e+23`; the display does not overflow its box |
| 37 | `10` `xʸ` `21` `=` | Exponent notation such as `1e+21`, not a 22-digit string |
| 38 | `0.0000001` `×` `1` `=` | A sensible small-number display, no scientific-notation noise for ordinary values |

**Number entry** (check each against the visible display): `007` shows `7`; `.5` shows `0.5`; a second `.` in one number is ignored; `±` on `0` and on an empty entry behaves sensibly; `⌫` removes the last digit and falls back to `0` (including from `-5`); `C` resets display, expression and any error; entry length is limited (type 25 digits and report what happens); an error message disappears on the next key press and a digit after an error starts a fresh number; `⌫` on a result does nothing.

### 4.3 Keyboard and paste

- Type `15%200` then `Enter` gives `30`; `2^10=` gives `1024`; `9/3*2=` gives `6`; `Backspace`, `Escape`, `c` and the numpad work.
- **Tab to a keypad button and press `Enter`:** it must activate that button once (for example enter the digit), not evaluate. Also press `Space`. Clicking keys with the mouse and then typing on the keyboard must work without clicking elsewhere first.
- Paste: `123.45` and `-3` accepted; `abc`, blank, `Infinity`, `0x10` rejected with a short message and **no request**. Record how `1e5` and `" 12 "` (with spaces) behave (observations, not pass or fail).

### 4.4 Waiting, failures and recovery

Use request interception or network throttling in the browser tooling (do not modify the app):

- **Delay the API by about 3 seconds** and press `=`: "Calculating…" appears, the keys that would change or resubmit the calculation are disabled, and pressing `=` repeatedly causes **one** request.
- **Press `C` during the delay:** the UI resets and the late response is **not** displayed.
- **Delay beyond the timeout (about 12 seconds):** a friendly timeout message appears and the UI is usable again.
- **Backend stopped:** press `=` and read the message (plain language, for example that it cannot reach the calculator service). Restart the backend and check the next calculation works **without reloading the page**.
- **API returns 500, malformed JSON or an unexpected shape** (intercept the response): a plain-language error appears and nothing crashes.
- Reload mid-error and after a result to confirm a clean state.

### 4.5 Responsive layout and accessibility

- **Viewports:** 1280×800, 768×1024, 390×844 (phone, touch emulation), **360×740**, 320×568, landscape phone 740×360; plus 200% browser zoom at desktop width. At each: screenshot; no horizontal page scroll (`document.documentElement.scrollWidth <= window.innerWidth`); the whole keypad usable; long values (matrix #36) stay inside the display; keys **at least 44×44 px** (measure bounding boxes).
- **Keyboard only:** complete a calculation using only `Tab`, `Shift+Tab`, `Enter`, `Space`. The tab order follows the visual layout, a clearly visible focus ring appears on every key (screenshot a few), and no keyboard trap exists.
- **Screen-reader semantics:** dump the accessibility tree (for example Playwright `locator.ariaSnapshot()`). Every key has a meaningful accessible name (`divide`, `square root`, `percent of`, `backspace`, `clear`, `change sign`, not just `÷` or an empty label); the result sits in an `aria-live="polite"` region that updates after a calculation; errors use `role="alert"`; the display is labeled. If you can install `axe-core` in your scratch folder, run it and report its violations.
- **Contrast:** spot-check text and key colors against WCAG AA, including the disabled state and the error text.
- **Reduced motion:** emulate `prefers-reduced-motion: reduce` and confirm animations stop.
- **Console and network hygiene:** no console errors or warnings, no failed requests other than ones you caused, no requests to other origins, no unexpected extra requests.
- On touch emulation: no accidental double-tap zoom on keys and no on-screen keyboard popping up over the keypad.

### 4.6 Human-experience scores

Score each 1 to 5 (1 poor, 5 excellent) with a one or two sentence justification citing a screenshot or concrete behavior. Mark subjective judgments as subjective.

| Aspect | Look for |
| --- | --- |
| Familiarity | Layout and behavior match everyday calculators |
| Discoverability | A first-time user can find and understand `xʸ`, `% of`, `√`, `±`, `⌫`, `C`; it is clear which number is the percentage and which is the base |
| Feedback | The pending operator is visible; the expression line explains what is happening; "Calculating…" is clear; key presses feel acknowledged |
| Number readability | Large numbers readable; rounding makes sense; no layout breakage (no thousands separators is an observation, not a failure) |
| Error communication | Plain language, says what went wrong and what to do; recovery is easy |
| Mobile ergonomics | Reachable keys, comfortable sizes, no accidental zoom, no small-screen layout problems |
| Keyboard and accessibility | Full keyboard operation, clear focus, sensible names |
| Visual polish | Consistent spacing and alignment, contrast, no leftover template content (default Vite page, stray logos), sensible title and favicon |
| Trust | Would you trust the answers? Any moment of doubt (a result changing unexpectedly, lag without a pending state)? |

Also list things that feel **missing for a normal user but are outside the spec** (for example repeated `=`, thousands separators, a visible operator highlight, copy result), clearly labeled as suggestions, not defects. Note behavior that the spec allows but that is confusing in practice.

## 5. Phase 4: Deliverables and specification audit (now read the code)

Judge against the **company objective first**, then the **build prompt**, then general good practice, and label which is which. Every finding cites evidence: file and line, command and output, or a workflow run URL. No evidence means `NOT VERIFIED`, never `PASS`. Do not round up, do not invent metrics, do not pad with praise. The README, commit messages and the engineer's summary are claims; re-run the checks yourself.

### A. Objective checklist (company requirements)

| ID | Requirement | How to verify |
| --- | --- | --- |
| O1 | Git repository containing frontend and backend code | Inspect structure and history |
| O2 | All 7 operations work end to end | Section D and the browser matrix |
| O3 | Frontend: intuitive input and result UI, input validation, error handling, responsive | Phase 3 plus code review |
| O4 | Backend: REST endpoints, JSON, validation, division by zero and invalid data handled | Section D |
| O5 | Clean, readable, idiomatic code in both layers | Section E |
| O6 | Unit tests for both layers and a coverage report | Run them; compare measured to claimed coverage |
| O7 | README: setup, how to run each layer, API examples, design decisions and assumptions | Phase 2 and section C |
| O8 | Optional Dockerfile runs frontend and backend together | Build and run it |
| O9 | Prompts used are shared | `docs/AI_PROMPT.md`, `docs/AI_PROMPTS.md`, linked from the README |
| O10 | Repository link can be shared with reviewers | Visibility and access state; note what I must still do |
| O11 | React (TypeScript) frontend, Go backend | `package.json`, `tsconfig`, `go.mod` |

### B. Build-prompt compliance

**Stack and structure:** React + TypeScript + Vite in `frontend/`; Go standard-library HTTP server in `backend/`; one repository. Runtime frontend dependencies are only `react` and `react-dom`; `go.mod` has no third-party requirements (list and judge any extra dependency). The pure `calc` package has no HTTP imports; the HTTP layer is thin; the API client is separate from presentation; the state reducer and formatter are pure. `PORT` (default 8080) and `STATIC_DIR` are supported; Vite proxies `/api` to the backend; the frontend uses the relative path `/api/v1/calculate`. Go and Node versions are declared (`go.mod`, `.nvmrc`, `engines`); `package-lock.json` is committed.

**Calculation rules:** `0^0 = 1`; `0^negative`, negative base with non-integer exponent and `NaN` give `undefined_result`; infinite results give `result_out_of_range`; a negative base with an integer exponent is valid; percentage is `a * b / 100` with a fallback to `a / 100 * b` only on product overflow; the API returns full-precision `float64` and rounding happens only in the frontend display.

**Frontend (code review):** native `<button>` keys with accessible names; left-to-right chaining; `=` on an incomplete expression sends no request; `√` sends only `a`; pending state disables keys, prevents duplicates, `C` cancels with `AbortController`, late responses are ignored, a timeout exists; API errors, malformed responses and network failures get plain-language messages; keyboard handling and paste validation exist; a final finite-number guard precedes every API call; display formatting follows the rules in section 0; `aria-live` for results and `role="alert"` for errors; visible focus styles; 44 px targets; `prefers-reduced-motion` respected.

**Tests and coverage:** Go table-driven tests for all operations and the edge cases; `httptest` API tests for every error code, missing versus `null` versus `0`, malformed and trailing JSON, oversize body, 405 with `Allow`, `/healthz`. Frontend tests (Vitest + React Testing Library, mocked API client) for valid calculation, rejected input with no network call, unary and percent behavior, error and network failure, pending and stale-response behavior, reducer and formatter unit tests, keyboard. A smoke test of the real frontend-to-backend path exists. Run `gofmt -l`, `go vet ./...`, `go test ./... -covermode=atomic -coverprofile=coverage.out`, `go tool cover -func`, `npm ci`, lint, type check, `npm run test:coverage`, and build. **Record the measured Go statement coverage and frontend line and branch coverage** and compare with the README. Confirm no arbitrary coverage threshold was imposed. Look for weak tests (assertions that cannot fail, mocks that hide logic, skipped tests). Run the tests more than once and report flakiness.

**Docker and CI:** the root `Dockerfile` is multi-stage, minimal, non-root, serves UI and API on one port, and `.dockerignore` exists. Build it and verify the UI, a static asset referenced by the HTML, `/healthz` and a real calculation; confirm the runtime user is not root. `.github/workflows/ci.yml` triggers on pull requests and pushes to the default branch, uses declared Go and Node versions and `npm ci`, sets workflow-level `permissions: contents: read`, and runs gofmt check, vet, Go tests, frontend lint, type check, tests, build of both layers, coverage artifact upload, and container build plus smoke test. If a publish job exists, it runs only on pushes to the default branch after CI passes, has only the permissions it needs (`packages: write`), uses `GITHUB_TOKEN`, tags with the commit SHA, and exposes no secret. If an image is documented as published, try the documented `docker pull` (ask me for credentials if the package is private). Use `gh run list` and `gh run view` (or ask me for the run page) to inspect the runs for `AUDITED_SHA`; **confirm that CI tested (and published, if applicable) exactly `AUDITED_SHA`**; check the coverage artifacts exist and download them if possible. If the README claims a live demo, check it; if it claims none, confirm that is stated clearly.

### C. README and prompts

Beyond the newcomer test in Phase 2, check the README contains: an API reference with the full error-code table; a binary request, a square-root request and an error example with expected output (with PowerShell equivalents); design decisions and assumptions; percentage semantics; `0^0` and the other edge-case policies; chaining without precedence; float64 limits and why it is unsuitable for exact money; test and coverage commands with measured numbers; CI and registry instructions; a link to the prompts. Every command, path, port, script name and URL it mentions exists or resolves. `docs/AI_PROMPT.md` exists and is verbatim identical to the original build prompt (diff them). `docs/AI_PROMPTS.md` records other prompts used (or states what is missing). Both are linked from the README.

### D. Black-box API check

Start the backend from the clean checkout using the README's own commands and send these requests with `curl`. Compare status, `error.code`, result and headers. Confirm `Content-Type: application/json` on every response and `Cache-Control: no-store` on API responses.

| # | Request body (POST `/api/v1/calculate`) | Expect |
| --- | --- | --- |
| 1 | `{"operation":"add","a":1,"b":2}` | 200, `result` 3 |
| 2 | `{"operation":"add","a":0.1,"b":0.2}` | 200, `0.30000000000000004` (not rounded by the API) |
| 3 | `{"operation":"add","a":0,"b":0}` | 200, `0` (zero is not missing) |
| 4 | `{"operation":"percent","a":15,"b":200}` | 200, `30` |
| 5 | `{"operation":"sqrt","a":81}` | 200, `9` |
| 6 | `{"operation":"divide","a":1,"b":0}` | 422 `division_by_zero` |
| 7 | `{"operation":"sqrt","a":-1}` | 422 `negative_square_root` |
| 8 | `{"operation":"power","a":0,"b":0}` | 200, `1` |
| 9 | `{"operation":"power","a":0,"b":-1}` | 422 `undefined_result` |
| 10 | `{"operation":"power","a":-8,"b":0.5}` | 422 `undefined_result` |
| 11 | `{"operation":"power","a":-2,"b":3}` | 200, `-8` |
| 12 | `{"operation":"power","a":10,"b":400}` | 422 `result_out_of_range` |
| 13 | `{"operation":"multiply","a":1e200,"b":1e200}` | 422 `result_out_of_range` |
| 14 | `{"operation":"percent","a":50,"b":1.7e308}` | 200, about `8.5e307` |
| 15 | `{"operation":"add","a":1}` | 400 `missing_operand` |
| 16 | `{"operation":"add","a":null,"b":1}` | 400 `invalid_operand` |
| 17 | `{"operation":"add","a":"1","b":2}` | 400 `invalid_operand` |
| 18 | `{"operation":"add","a":1e999,"b":1}` | 400 `invalid_operand` |
| 19 | `{"operation":"sqrt","a":4,"b":2}` and `{"operation":"sqrt","a":4,"b":null}` | 400 `unexpected_operand` (both) |
| 20 | `{"operation":"foo","a":1,"b":2}` and a body with no `operation` | 400 `unknown_operation` |
| 21 | `{"operation":"add","a":1,"b":` | 400 `invalid_json` |
| 22 | `{"operation":"add","a":1,"b":2}{}` | 400 `invalid_json` |
| 23 | Empty body | 400 `invalid_json` |
| 24 | `{"operation":"add","a":1,"b":2,"extra":true}` and `[1,2]` | 400 `invalid_request` |
| 25 | A body larger than 4 KiB | 413 `request_too_large` |
| 26 | `GET /api/v1/calculate` (also PUT, DELETE) | 405 `method_not_allowed`, `Allow: POST`, JSON body |
| 27 | `GET /healthz` | 200, `{"status":"ok"}` |
| 28 | `GET /api/nope` | JSON 404, not an HTML page |

If the implementation differs from this table but is documented and defensible, record `PARTIAL` or an observation and say which source (build prompt or README) governs. With the container running (or `STATIC_DIR` set), confirm `/` serves the UI.

### E. Code quality review

Read the code, not just the tests. Assess idiomatic Go (error handling, no panics on bad input, typed errors mapped to codes, no globals, timeouts, graceful shutdown) and idiomatic React and TypeScript (strict mode, no `any`, no unused code, correct effects and cleanup, no stale-closure bugs, injectable API client); naming, function size, duplication, dead code, comments that explain why; a sensible commit history (small meaningful commits); leftover template files. Look for correctness bugs the tests might miss: float handling, validation gaps, races between rapid key presses and in-flight requests, leaks. Each issue gets a severity and a file and line.

### F. Hygiene and security

- `git ls-files` shows no `node_modules`, `dist`, coverage output, binaries, `.env` or editor files; `.gitignore` covers them.
- Scan the whole history for secrets (tokens, keys, passwords, `ghp_`, `github_pat_`, `AKIA`, private keys, credentials in remote URLs). Never print a secret value; give the location and kind only.
- Check for unrelated private content in the repository or the prompt files (home paths, other emails, internal URLs).
- Dependency sanity: `npm audit` and `govulncheck` if available (report only what you ran); pinned versions in CI.

## 6. Grading

Score only what you verified. Award points per category with a one or two sentence justification. Items you could not verify are listed separately as `NOT VERIFIED`; do not guess them, and state the maximum score if they had all passed.

| Category | Points | Covers |
| --- | --- | --- |
| A. Requirements and specification compliance | 20 | Objective checklist, stack, structure, API contract, calculation rules |
| B. Calculator correctness | 20 | Black-box API table and the browser matrix |
| C. Human experience | 15 | Familiarity, feedback, errors, mobile, keyboard, accessibility, polish |
| D. Fresh-install experience | 15 | README followed on a clean slate, both paths, troubleshooting, time to first calculation |
| E. Tests and coverage | 10 | Quality and breadth of tests, reproducible coverage, measured versus claimed |
| F. Code quality and architecture | 10 | Separation of concerns, idiomatic code, maintainability |
| G. Delivery: Docker, CI, hygiene, security, prompts | 10 | Image, workflow, repository cleanliness, prompt files, repository access |

**Gates:** any `Blocker` (the app cannot be started by following the README; any of the 7 operations returns a wrong result; a core deliverable is missing; a secret is committed) caps the total at 59. Bands: 90 to 100 excellent, 75 to 89 good, 60 to 74 acceptable with issues, below 60 not ready. Keep the company objective as the main basis: shortfalls against the build prompt that do not affect the company objective are recorded as prompt deviations and graded as `Minor` or `Major`, not `Blocker`.

## 7. Report

Write the report to a Markdown file outside the repository (for example `~/review-reports/review-report.md`), with evidence next to it, and give me a short summary in chat. Structure:

1. **Verdict and grade:** total score out of 100, the band, and three sentences on why. Also two one-line verdicts: **Fresh-install:** `WORKS AS WRITTEN`, `WORKS WITH DEVIATIONS` or `BLOCKED` (state the clean-slate level, A, B or C); **Calculator:** `CORRECT AND USABLE`, `USABLE WITH ISSUES` or `NOT READY`.
2. **Environment and target:** `AUDITED_SHA`, OS, shell, architecture, browser and version, how the clean environment was made, tools already present, what was **not** tested (for example other operating systems).
3. **Category scores** with justifications.
4. **Scorecard:** every ID from sections A to D and F with its status (`PASS`, `FAIL`, `PARTIAL`, `NOT VERIFIED`) and evidence.
5. **Fresh-install log:** per README path a step table (step, command, result, matched README?, deviation?), time to first calculation, every unstated prerequisite and confusing sentence.
6. **Test results:** the correctness matrix and API table (actual versus expected); keyboard, paste, pending, failure-recovery, responsive and accessibility results; network and console findings; measured coverage versus claimed; CI run links and whether CI tested `AUDITED_SHA`.
7. **Human-experience scorecard** with justifications, the three best things, the three most important improvements, and the out-of-spec suggestions.
8. **Findings:** ranked `Blocker`, `Major`, `Minor`, `Nit`, each with exact reproduction steps or location, evidence, why it matters, and a one or two line suggested fix; likely area (README, frontend, backend, Docker, CI).
9. **Not tested / not verified**, each with the reason.
10. **Commands you ran**, **owner actions outstanding**, and **cleanup done**.

Report only what you actually observed. If something worked, say so briefly. If you could not test something, say so instead of guessing.

## 8. Phase 6: Add this prompt to the repository

The repository should keep the prompts used in the work. This prompt is one of them, but you must not disturb what you graded. Do this **only after** the report is written, and only using the method I chose in section 1.4:

- **Recommended: docs-only commit to the default branch.** Use a **fresh clone** (not the one where you ran builds, so no generated files get committed). Create `docs/AI_PROMPT_REVIEW.md` containing this prompt **verbatim and in full** (the text of the message you received, from the first heading to the end). If `docs/AI_PROMPTS.md` exists, append one line that lists the new file with a link; change nothing else. Do not edit the README.
- **Alternative: branch plus pull request** with the same content, leaving the default branch untouched so I decide when to merge.
- **Fallback if you have no write access or I decline:** save a ready-to-commit copy outside the repository, tell me its path, and give me the exact `git` commands to run.

Before committing: `git status` and `git diff --cached --name-only` must list only those docs files. Commit with the repository's configured Git identity (never change global config) and the message `docs: add reviewer prompt used to grade this submission`. Do not add `[skip ci]` or otherwise hide the commit from CI. After pushing, confirm the commit is on the remote, that `AUDITED_SHA` is its ancestor, and report the result of the CI run it triggers. In your final message, state clearly that **the grade applies to `AUDITED_SHA`** and that the docs commit is the only change you made to the repository.
