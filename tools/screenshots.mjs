// Takes README screenshots with a running timer. Usage: node tools/screenshots.mjs (server must be up)
import { chromium } from '@playwright/test';

const exe = process.env.PW_CHROMIUM_PATH;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const T0 = new Date(2026, 8, 30, 10, 0, 0).getTime();
const DAY = 86400000;
const log = [];
for (let d = 6; d >= 0; d--) for (let i = 0; i < [3, 5, 4, 6, 2, 0, 3][6 - d]; i++) log.push({ t: T0 - d * DAY + i * 1800000, p: 'pomodoro', s: 1500 });

async function shot(name, { theme, lang, width = 1280, height = 800, preset = 'pomodoro', forward = '07:21', open } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: theme, locale: lang === 'tr' ? 'tr-TR' : 'en-US', deviceScaleFactor: 2 });
  await page.clock.install({ time: T0 });
  await page.goto('http://localhost:4173/?nosw=1');
  await page.evaluate(({ log, theme, lang }) => {
    localStorage.clear();
    localStorage.setItem('ft:log', JSON.stringify(log));
    localStorage.setItem('ft:settings', JSON.stringify({ theme, lang }));
  }, { log, theme, lang });
  await page.reload();
  await page.locator(`.chip[data-preset="${preset}"]`).click();
  await page.locator('#btn-main').click();
  await page.clock.fastForward(forward);
  if (open === 'stats') await page.keyboard.press('i');
  if (open === 'settings') await page.keyboard.press('s');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `docs/img/${name}.png` });
  await page.close();
  console.log('wrote', name);
}

await shot('dark', { theme: 'dark', lang: 'en' });
await shot('light-tr', { theme: 'light', lang: 'tr', preset: 'fiftytwo', forward: '12:40' });
await shot('stats', { theme: 'dark', lang: 'en', open: 'stats' });
await shot('settings', { theme: 'dark', lang: 'en', preset: 'tabata', forward: '00:05', open: 'settings' });
await shot('mobile', { theme: 'dark', lang: 'en', width: 390, height: 844, preset: 'flowtime', forward: '31:07' });
await browser.close();
