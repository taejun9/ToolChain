import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
// Playwright Firefox shares the installed Firefox app data directory on macOS.
const firefoxDirectory =
  process.platform === 'darwin' && !process.env.CFFIXED_USER_HOME
    ? mkdtempSync(join(tmpdir(), 'toolchain-firefox-'))
    : undefined
try {
  if (firefoxDirectory) {
    // macOS attaches a deny-delete ACL when Firefox creates these folders.
    mkdirSync(join(firefoxDirectory, 'Downloads'))
    mkdirSync(join(firefoxDirectory, 'Library', 'Application Support'), {
      recursive: true,
    })
  }
  const env = firefoxDirectory
    ? { ...process.env, CFFIXED_USER_HOME: firefoxDirectory }
    : process.env
  const result = spawnSync(
    process.execPath,
    [cli, 'test', ...process.argv.slice(2)],
    {
      env,
      stdio: 'inherit',
    },
  )
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  if (firefoxDirectory)
    rmSync(firefoxDirectory, { recursive: true, force: true, maxRetries: 5 })
}
