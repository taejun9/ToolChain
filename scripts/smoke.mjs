import assert from 'node:assert/strict'
const site = new URL(process.argv[2])
for (const path of ['/', '/tools/json.format', '/editor']) {
  const response = await fetch(new URL(path, site), {
    headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' },
  })
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('content-type') ?? '', /text\/html/)
  assert.match(
    response.headers.get('content-security-policy') ?? '',
    /worker-src 'self'/,
  )
  assert.match(response.headers.get('x-content-type-options') ?? '', /nosniff/)
  const html = await response.text()
  assert.match(html, /id="app"/)
  const script = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1]
  assert.ok(script, 'JavaScript entry')
  const asset = await fetch(new URL(script, site))
  assert.equal(asset.status, 200)
  assert.match(asset.headers.get('content-type') ?? '', /javascript/)
  assert.match(asset.headers.get('cache-control') ?? '', /immutable/)
}
for (const [path, body] of [
  ['/robots.txt', 'User-agent:'],
  ['/sitemap.xml', '<urlset'],
]) {
  const response = await fetch(new URL(path, site))
  assert.equal(response.status, 200)
  assert.ok((await response.text()).includes(body))
}
console.log(
  'Static assets, CSP, cache, crawler metadata and SPA routes verified.',
)
