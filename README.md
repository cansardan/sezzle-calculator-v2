# Calculator

A calculator you use in the browser. The buttons look like a pocket calculator. Every sum is worked out by a small Go web service, not by the page itself.

It has a React + TypeScript front end (`frontend/`) and a Go REST service (`backend/`). It supports add, subtract, multiply, divide, power, square root and percentage.

The screen is one display on top and a keypad below. An expression line above the result shows what you are calculating, for example `15 % of 200`.

## 1. Get the code

You need access to the repository, because it is private.

**Option A: Git.** Install Git from <https://git-scm.com/downloads>. Then open a terminal (Terminal on macOS/Linux, PowerShell on Windows) and run:

```bash
git clone https://github.com/cansardan/sezzle-calculator-v2.git
cd sezzle-calculator-v2
```

**Option B: ZIP.** Open the repository page on GitHub, click the green **Code** button, then **Download ZIP**. Unzip it and open a terminal in the unzipped folder.

## 2. Fastest way: run with Docker

1. Install Docker Desktop from <https://www.docker.com/products/docker-desktop/> (macOS, Windows and Linux). Start it and wait until it says it is running.
2. In the project folder, build the image. This takes a minute or two the first time:

   ```bash
   docker build -t sezzle-calculator .
   ```

   The last lines say the image was exported and named `sezzle-calculator`.

3. Start it:

   ```bash
   docker run --rm -p 8080:8080 sezzle-calculator
   ```

   You should see a line like `msg=listening addr=[::]:8080`.

4. Open <http://localhost:8080> in your browser.
5. To stop it, go back to the terminal and press `Ctrl+C`.

## 3. Run from source (no Docker)

You need two tools. These are the versions this project was built and tested with:

| Tool | Version | Download | Check it |
| --- | --- | --- | --- |
| Go | 1.27.4 (1.27 or newer) | <https://go.dev/dl/> | `go version` |
| Node.js | 22 or newer (tested with 22.23.5) | <https://nodejs.org/> | `node --version` |

Check what you have first. If both commands print the versions above (or newer), skip to "Terminal 1".

### Install Go 1.27.4 and Node.js 22

**macOS and Windows.** Download the installers from the links in the table, run them, then **open a new terminal** and check the versions. (With a package manager: `brew install go node@22` on macOS, or `winget install GoLang.Go OpenJS.NodeJS.LTS` on Windows.)

**Linux (Ubuntu/Debian, no `sudo` needed).** Do not use `apt install golang`: Ubuntu 22.04 ships Go 1.18, which is too old for this project. These steps install into your home folder and leave the system tools alone. They were tested on Ubuntu 22.04 (WSL, x86-64). On an ARM machine, replace `amd64` with `arm64`.

1. Install Go:

   ```bash
   curl -fsSLO https://go.dev/dl/go1.27.4.linux-amd64.tar.gz
   echo "7226736c2339719cda28fbf3a54d71aa63bcefe376e98cef00034268dab24840  go1.27.4.linux-amd64.tar.gz" | sha256sum -c -
   mkdir -p ~/.local/go1.27.4 ~/.local/bin
   tar -C ~/.local/go1.27.4 --strip-components=1 -xzf go1.27.4.linux-amd64.tar.gz
   ln -sf ~/.local/go1.27.4/bin/go ~/.local/bin/go
   ln -sf ~/.local/go1.27.4/bin/gofmt ~/.local/bin/gofmt
   rm go1.27.4.linux-amd64.tar.gz
   ```

   The `sha256sum` line must print `OK`. Make sure `~/.local/bin` comes before `/usr/bin` in your `PATH` (on Ubuntu it does by default once the folder exists and you open a new terminal), then run `go version`. It should say `go1.27.4`.

2. Install Node.js 22 with [nvm](https://github.com/nvm-sh/nvm) (skip the first command if you already have nvm):

   ```bash
   curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
   ```

   Open a new terminal, then:

   ```bash
   nvm install 22.23.5
   nvm use 22.23.5
   node --version
   ```

   It should print `v22.23.5`. `nvm use` only affects the terminal you run it in, so run it again in the second terminal (or run `nvm alias default 22.23.5` once to make it permanent).

Use two terminals (Terminal on macOS/Linux, PowerShell on Windows), both opened in the project folder.

**Terminal 1: the backend.**

```bash
cd backend
go run ./cmd/server
```

You should see `msg=listening addr=[::]:8080`. Leave it running.

**Terminal 2: the front end.**

```bash
cd frontend
npm ci
npm run dev
```

You should see `Local: http://localhost:5173/`. Open <http://localhost:5173>. The dev server forwards `/api` calls to the backend on port 8080.

To serve the built app from the Go server alone (this is what Docker does):

```bash
cd frontend && npm ci && npm run build && cd ..
cd backend && STATIC_DIR=../frontend/dist go run ./cmd/server
```

On PowerShell, set the folder first with `$env:STATIC_DIR = "../frontend/dist"`, then run `go run ./cmd/server`.

Settings (environment variables): `PORT` (default `8080`) and `STATIC_DIR` (folder with the built front end; if it is not set, only the API is served).

## 4. Using the calculator

- Click the keys, or type on your keyboard.
- It works **left to right like a pocket calculator**. `2 + 3 × 4 =` gives `20`, not `14`. There is no operator precedence.
- Pressing a second operator first works out the first part, then carries on with that result.
- `√` works on the number on screen straight away.
- `% of` means "a percent of b": `15 % of 200` is `30`.
- After a result, typing a digit starts a new number. Pressing an operator carries on from the result.
- Calculations are normally instant, so nothing changes on screen. Only if the service takes longer than one second do you see "Calculating…" and most keys switch off. Either way, extra key presses are ignored until the answer arrives. `C` always works and cancels the request.
- Errors from the service appear in a red box under the display, and the expression stays visible.
- You can paste a number (Ctrl+V / Cmd+V). Anything that is not a plain decimal number is refused.

| Key | Keyboard |
| --- | --- |
| Digits, decimal point | `0`-`9`, `.` |
| `+  −  ×  ÷  xʸ  % of` | `+  -  *  /  ^  %` |
| `=` | `=` or `Enter` (a focused button is activated by `Enter` instead) |
| `⌫` | `Backspace` |
| `C` | `Escape` or `c` |

## 5. Run the tests and see coverage

Backend (Go, from the `backend` folder):

```bash
go test ./... -covermode=atomic -coverprofile=coverage.out
go tool cover -func=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

Open `backend/coverage.html` in a browser.

Front end (from the `frontend` folder):

```bash
npm ci
npm run test:coverage
```

Open `frontend/coverage/index.html` in a browser. Other checks: `npm run lint`, `npm run typecheck`, `npm run build`.

Smoke test of the whole app (with the app running on port 8080):

```bash
node scripts/smoke.mjs http://localhost:8080
```

Measured on the last run before publishing:

| Layer | Result |
| --- | --- |
| Go statements (all packages) | 90.7% (`calc` 100%, `api` 98.0%, `cmd/server` 56.7% because `main()` itself is not run in tests) |
| Front end lines | 100% |
| Front end branches | 99.55% |

## 6. API reference

`POST /api/v1/calculate`

Request body (JSON, at most 4 KiB):

| Field | Type | Notes |
| --- | --- | --- |
| `operation` | string | `add`, `subtract`, `multiply`, `divide`, `power`, `sqrt`, `percent` |
| `a` | number | Always required. |
| `b` | number | Required except for `sqrt`, where it must be left out. |

`percent` means `a` percent of `b`. Success returns HTTP 200 and `{"result": <number>}`. Responses are `application/json; charset=utf-8` with `Cache-Control: no-store`.

`GET /healthz` returns `{"status":"ok"}`.

Errors always look like `{"error":{"code":"division_by_zero","message":"Cannot divide by zero."}}`:

| Status | `code` | When |
| --- | --- | --- |
| 400 | `invalid_json` | Empty body, malformed JSON, or extra data after the first JSON value |
| 400 | `invalid_request` | Valid JSON of the wrong shape: not an object, unknown fields, `operation` not a string |
| 400 | `unknown_operation` | `operation` missing or not one of the seven names |
| 400 | `missing_operand` | A required operand is absent (absent is different from `0`) |
| 400 | `invalid_operand` | Operand is `null`, a string, boolean, array or object, or a number outside the `float64` range (for example `1e999`) |
| 400 | `unexpected_operand` | `b` supplied (even `null`) for `sqrt` |
| 405 | `method_not_allowed` | Any method other than POST on the route (`Allow: POST` is sent) |
| 413 | `request_too_large` | Body over 4 KiB |
| 422 | `division_by_zero` | `divide` with `b` equal to 0 |
| 422 | `negative_square_root` | `sqrt` of a negative number |
| 422 | `undefined_result` | `0` to a negative power, a negative base with a non-integer exponent, or another NaN |
| 422 | `result_out_of_range` | The result is infinite |

Unknown paths under `/api/` return a JSON `404` with code `not_found`.

**Binary example** (macOS/Linux):

```bash
curl -s -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"percent","a":15,"b":200}'
```

```json
{"result":30}
```

The same on Windows PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/calculate `
  -ContentType 'application/json' `
  -Body '{"operation":"percent","a":15,"b":200}'
```

**Square root example** (leave out `b`):

```bash
curl -s -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"sqrt","a":81}'
```

```json
{"result":9}
```

**Error example:**

```bash
curl -s -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"divide","a":5,"b":0}'
```

```json
{"error":{"code":"division_by_zero","message":"Cannot divide by zero."}}
```

## 7. Design decisions and assumptions

- **Separated layers.** The Go `calc` package does only arithmetic and imports nothing HTTP-related. The `api` package parses and validates requests and maps typed errors to codes, and its handlers stay thin. On the front end, `src/calculator/` is a pure reducer and number formatter (no React, no fetch), `src/api/` is the HTTP client only, `src/hooks/` connects them, and `src/components/` only draws things. Each part can be tested alone. The API client is injected into `App`, so component tests use a fake instead of patching globals.
- **The server validates everything.** The front end never does arithmetic and checks that both operands are finite before it sends a request, but the API does not trust it.
- **Absent is not zero.** Operands are read as raw JSON, so a missing `a`, a `null`, a string and `0` each get their own treatment.
- **Percentage** is "a percent of b", computed as `a * b / 100`. If `a * b` overflows but `a / 100 * b` does not, the second form is returned, so `50 % of 1.7e308` works.
- **Chaining** is left to right with no precedence, like a pocket calculator.
- **Edge cases.** `0^0` returns `1` (the IEEE 754 / `math.Pow` convention). `0` to a negative power is `undefined_result`. A negative base with a non-integer exponent (for example `(-8)^(1/3)`) is `undefined_result`, but `(-2)^3 = -8` is fine. Any infinite result is `result_out_of_range`. Underflow to zero is accepted. `-0` is returned as `0`.
- **Why a keypad.** People already know how to use one. It also avoids form validation problems, since you cannot type letters into a display.
- **Out of scope on purpose:** database, accounts, history, memory keys, themes, extra operations, UI kits, routers, state libraries and big-number libraries.

## 8. Numeric precision

The service uses `float64` and JSON numbers. The API returns the full value, so `0.1 + 0.2` returns `0.30000000000000004`. Only the screen rounds: it shows at most 12 significant digits and strips trailing zeros, so you see `0.3`. The exact value is still used if you carry on calculating. Thousands are separated with commas on screen (`1,234,567`); the commas are display only and never sent to the API. Very large or small numbers show in exponent form, such as `1.5e+21`.

`float64` is **not suitable for exact money arithmetic**, because many decimal fractions cannot be stored exactly. For real money, use whole numbers of the smallest unit (for example cents) or a decimal type, and send amounts as strings in the API.

## 9. CI, container registry and live demo

GitHub Actions (`.github/workflows/ci.yml`) runs on pull requests and on pushes to `main`. It checks Go formatting, runs `go vet`, the Go tests with coverage and a build. It also runs lint, type check, tests with coverage and the build for the front end. Both coverage reports are uploaded as artifacts. Last, it builds the Docker image, starts it and runs `scripts/smoke.mjs` against the container.

The image is **not published** to any registry. There is **no live demo**; run it with Docker or from source as described above.

## 10. Troubleshooting

- **"address already in use" or port 8080 is busy.** Another program uses the port. Stop it, or use another port: `PORT=9090 go run ./cmd/server` (PowerShell: `$env:PORT = "9090"`), or `docker run --rm -p 9090:8080 sezzle-calculator` and open <http://localhost:9090>. If you change the backend port in development, also change the proxy target in `frontend/vite.config.ts`.
- **"Cannot connect to the Docker daemon".** Docker Desktop is not running. Start it and try again.
- **Wrong Node or Go version.** Check with `node --version` and `go version`. Node must be 22 or newer and Go 1.27 or newer.
- **The page says "Can't reach the calculator service".** The backend is not running. Start it (section 3) and press `=` again.

## 11. AI prompts

The prompts used to build this are in [`docs/AI_PROMPT.md`](docs/AI_PROMPT.md) (the full assignment prompt) and [`docs/AI_PROMPTS.md`](docs/AI_PROMPTS.md) (other prompts used along the way).
