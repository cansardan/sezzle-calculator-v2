// Smoke test for the packaged app: UI, a referenced static asset, health check
// and a real calculation. Usage: node scripts/smoke.mjs [baseUrl]
// The base URL defaults to http://localhost:8080.

const base = (process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '')

async function check(name, fn) {
  try {
    await fn()
    console.log(`ok   ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`)
    process.exitCode = 1
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

let html = ''

await check('UI is served at /', async () => {
  const response = await fetch(`${base}/`)
  assert(response.status === 200, `status ${response.status}`)
  html = await response.text()
  assert(html.includes('<div id="root">'), 'index.html has no #root element')
})

await check('a static asset referenced by the HTML is served', async () => {
  const match = html.match(/(?:src|href)="(\/assets\/[^"]+)"/)
  assert(match, 'no /assets/... reference found in the HTML')
  const response = await fetch(`${base}${match[1]}`)
  assert(response.status === 200, `${match[1]} returned ${response.status}`)
  const body = await response.arrayBuffer()
  assert(body.byteLength > 0, `${match[1]} is empty`)
})

await check('GET /healthz', async () => {
  const response = await fetch(`${base}/healthz`)
  assert(response.status === 200, `status ${response.status}`)
  const body = await response.json()
  assert(body.status === 'ok', `unexpected body ${JSON.stringify(body)}`)
})

await check('POST /api/v1/calculate (15 percent of 200 = 30)', async () => {
  const response = await fetch(`${base}/api/v1/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'percent', a: 15, b: 200 }),
  })
  assert(response.status === 200, `status ${response.status}`)
  const body = await response.json()
  assert(body.result === 30, `unexpected body ${JSON.stringify(body)}`)
})

await check('POST /api/v1/calculate returns a JSON error (5 / 0)', async () => {
  const response = await fetch(`${base}/api/v1/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'divide', a: 5, b: 0 }),
  })
  assert(response.status === 422, `status ${response.status}`)
  const body = await response.json()
  assert(body.error?.code === 'division_by_zero', `unexpected body ${JSON.stringify(body)}`)
})

if (process.exitCode) {
  console.error('Smoke test failed.')
} else {
  console.log('Smoke test passed.')
}
