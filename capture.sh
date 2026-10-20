#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [[ -z "${CAPTURE_URL:-}" || -z "${CAPTURE_DIR:-}" ]]; then
  echo "CAPTURE_URL and CAPTURE_DIR are required." >&2
  exit 1
fi

CAPTURE_DIR="$(realpath -m "$CAPTURE_DIR")"
case "$CAPTURE_DIR" in
  "$PROJECT_DIR"|"$PROJECT_DIR"/*)
    echo "CAPTURE_DIR must be outside the project source: $CAPTURE_DIR" >&2
    exit 1
    ;;
esac

export CAPTURE_URL CAPTURE_DIR

timed() {
  local label="$1"
  shift
  local started finished status
  started="$(date +%s%3N)"
  set +e
  "$@"
  status=$?
  set -e
  finished="$(date +%s%3N)"
  printf '[timing] %s: %d ms\n' "$label" "$((finished - started))"
  return "$status"
}

timed "prepare capture directory" mkdir -p "$CAPTURE_DIR"

timed "run Playwright capture" node --input-type=module <<'NODE'
import { createRequire } from 'node:module'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const runtime = join(process.env.HOME, '.local/share/omgithub-playwright')
const require = createRequire(join(runtime, 'package.json'))
const { chromium } = require('playwright')
const platformConfig = process.platform === 'darwin' ? 'metal.json' : 'linux.json'
const config = JSON.parse(readFileSync(join(runtime, platformConfig), 'utf8'))
if (process.platform === 'linux') {
  process.env.DISPLAY ||= `:${readFileSync(join(runtime, 'display'), 'utf8').trim()}`
}

const url = process.env.CAPTURE_URL
const outputDir = process.env.CAPTURE_DIR
const failure = (message, exitCode, cause) =>
  Object.assign(new Error(message, cause ? { cause } : undefined), { exitCode })
const transient = (message, cause) => failure(message, 75, cause)
const rendering = (message, cause) => failure(message, 1, cause)

const timed = async (label, action) => {
  const started = Date.now()
  try {
    return await action()
  } finally {
    console.log(`[timing] ${label}: ${Date.now() - started} ms`)
  }
}

const views = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, mobile: true }
]

let browser
let exitCode = 0
try {
  browser = await timed('launch browser', () =>
    chromium.launch({ ...config.browser.launchOptions, timeout: 30000 })
  ).catch((error) => {
    throw transient(`Could not launch Chromium: ${error.message}`, error)
  })

  for (const view of views) {
    const context = await timed(`${view.name} context`, () =>
      browser.newContext({
        viewport: view.viewport,
        screen: view.viewport,
        deviceScaleFactor: 1,
        isMobile: view.mobile,
        hasTouch: view.mobile,
        locale: 'en-US'
      })
    ).catch((error) => {
      throw transient(`Could not create the ${view.name} browser context: ${error.message}`, error)
    })

    const page = await context.newPage().catch((error) => {
      throw transient(`Could not open the ${view.name} page: ${error.message}`, error)
    })
    page.setDefaultTimeout(30000)
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    let response
    try {
      response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    } catch (error) {
      throw transient(`Navigation to ${url} failed: ${error.message}`, error)
    }

    const status = response?.status() ?? 0
    if (!response || !response.ok()) {
      const temporary = !response || [408, 429, 500, 502, 503, 504].includes(status)
      throw failure(`Navigation to ${url} returned HTTP ${status || 'no response'}.`, temporary ? 75 : 1)
    }

    try {
      await page.locator('#mainMenu.active').waitFor({ state: 'visible', timeout: 30000 })
    } catch (error) {
      const fatal = await page.locator('#fatalError.active').isVisible().catch(() => false)
      const loading = await page.locator('#loadingScreen.active').isVisible().catch(() => false)
      const state = fatal ? ' (fatal renderer screen shown)' : loading ? ' (stuck on loading screen)' : ''
      throw rendering(`The app did not reach the main menu${state}: ${error.message}`, error)
    }

    await page.waitForTimeout(1200)
    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector('#scene')
      if (!canvas) return { hasCanvas: false }
      const rect = canvas.getBoundingClientRect()
      return {
        hasCanvas: true,
        width: canvas.width,
        height: canvas.height,
        cssWidth: rect.width,
        cssHeight: rect.height
      }
    })

    if (!metrics.hasCanvas || metrics.width < 1 || metrics.height < 1 || metrics.cssWidth < 1 || metrics.cssHeight < 1) {
      throw rendering(`The 3D canvas did not render a usable surface (${JSON.stringify(metrics)}).`)
    }
    if (pageErrors.length) {
      throw rendering(`The page raised ${pageErrors.length} JavaScript error(s): ${pageErrors.join(' | ')}`)
    }

    const screenshotPath = join(outputDir, `final-${view.name}.png`)
    await timed(`${view.name} screenshot`, () =>
      page.screenshot({ path: screenshotPath, timeout: 30000 })
    ).catch((error) => {
      const temporary = error.name === 'TimeoutError' || !browser.isConnected()
      throw temporary
        ? transient(`Timed out capturing the ${view.name} screenshot: ${error.message}`, error)
        : rendering(`Could not capture the ${view.name} screenshot: ${error.message}`, error)
    })

    const bytes = statSync(screenshotPath).size
    if (bytes < 1024) throw rendering(`The ${view.name} screenshot is unexpectedly small (${bytes} bytes).`)
    console.log(`Saved ${screenshotPath} (${bytes} bytes)`)

    await timed(`${view.name} context close`, () => context.close()).catch((error) => {
      throw transient(`Could not close the ${view.name} browser context: ${error.message}`, error)
    })
  }
} catch (error) {
  console.error(error.stack || error.message)
  exitCode = error.exitCode || 1
} finally {
  if (browser) {
    await timed('close browser', () => browser.close()).catch((error) => {
      console.error(`Could not close the browser: ${error.message}`)
      if (exitCode === 0) exitCode = 75
    })
  }
}

process.exitCode = exitCode
NODE
