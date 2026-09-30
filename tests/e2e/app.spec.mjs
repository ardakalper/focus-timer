import { test, expect } from '@playwright/test';

// Every test starts with a clean storage and a fake clock at a fixed local time.
const T0 = new Date(2026, 8, 30, 10, 0, 0).getTime();

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: T0 });
  await page.goto('/?nosw=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const time = (page) => page.locator('#time');
const mainBtn = (page) => page.locator('#btn-main');
const stage = (page) => page.locator('#stage');

test('loads with Pomodoro at 25:00 and English UI', async ({ page }) => {
  await expect(time(page)).toHaveText('25:00');
  await expect(mainBtn(page)).toHaveText('Start');
  await expect(page.locator('#phase-label')).toHaveText('Focus');
  await expect(page.locator('.chip')).toHaveCount(11);
  await expect(page.locator('.chip[aria-pressed="true"]')).toHaveText(/Pomodoro/);
  await expect(page.locator('#dots .dot')).toHaveCount(4);
});

test('start, count down, pause, resume, reset', async ({ page }) => {
  await mainBtn(page).click();
  await expect(mainBtn(page)).toHaveText('Pause');
  await expect(stage(page)).toHaveAttribute('data-status', 'running');
  await page.clock.fastForward('01:30');
  await expect(time(page)).toHaveText('23:30');
  await expect(page).toHaveTitle(/^23:30 · Focus/);

  await mainBtn(page).click();
  await expect(mainBtn(page)).toHaveText('Resume');
  await page.clock.fastForward('05:00');
  await expect(time(page)).toHaveText('23:30', 'paused time does not move');

  await mainBtn(page).click();
  await page.clock.fastForward('00:30');
  await expect(time(page)).toHaveText('23:00');

  await page.locator('#btn-reset').click();
  await expect(time(page)).toHaveText('25:00');
  await expect(mainBtn(page)).toHaveText('Start');
});

test('a finished focus becomes a break, auto-starts it and is logged', async ({ page }) => {
  await mainBtn(page).click();
  await page.clock.fastForward('25:01');
  await expect(page.locator('#phase-label')).toHaveText('Break');
  await expect(stage(page)).toHaveAttribute('data-phase', 'short');
  // autoBreak defaults to on
  await expect(stage(page)).toHaveAttribute('data-status', 'running');
  await expect(time(page)).toHaveText('04:59');
  await expect(page.locator('#dots .dot.on')).toHaveCount(1);
  await expect(page.locator('#today')).toContainText('1');
  await expect(page.locator('#today')).toContainText('25 m');
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('ft:log')));
  expect(log).toHaveLength(1);
  expect(log[0]).toMatchObject({ p: 'pomodoro', s: 1500 });

  // break ends: focus is NOT auto-started by default
  await page.clock.fastForward('05:00');
  await expect(page.locator('#phase-label')).toHaveText('Focus');
  await expect(stage(page)).toHaveAttribute('data-status', 'idle');
  await expect(mainBtn(page)).toHaveText('Start');
  await expect(page.locator('#sub')).toHaveText('Round 2');
});

test('the 4th round leads to a long break', async ({ page }) => {
  for (let i = 0; i < 4; i++) {
    await mainBtn(page).click();
    await page.clock.fastForward('25:01');
    if (i < 3) {
      await expect(stage(page)).toHaveAttribute('data-phase', 'short');
      await page.clock.fastForward('05:01');
      await expect(stage(page)).toHaveAttribute('data-phase', 'focus');
    }
  }
  await expect(stage(page)).toHaveAttribute('data-phase', 'long');
  await expect(time(page)).toHaveText(/14:5\d/);
  await expect(page.locator('#dots .dot.on')).toHaveCount(4);
});

test('a running timer survives a reload and a long sleep', async ({ page }) => {
  await mainBtn(page).click();
  await page.clock.fastForward('10:00');
  await page.reload();
  await expect(time(page)).toHaveText('15:00');
  await expect(mainBtn(page)).toHaveText('Pause');
  // sleep through the end of focus and the whole break: wakes up idle on round 2
  await page.clock.fastForward('40:00');
  await expect(stage(page)).toHaveAttribute('data-phase', 'focus');
  await expect(stage(page)).toHaveAttribute('data-status', 'idle');
  await expect(page.locator('#sub')).toHaveText('Round 2');
});

test('skip records real elapsed focus time, short skips are not logged', async ({ page }) => {
  await mainBtn(page).click();
  await page.clock.fastForward('00:30');
  await page.locator('#btn-skip').click();
  await expect(stage(page)).toHaveAttribute('data-phase', 'short');
  expect(await page.evaluate(() => localStorage.getItem('ft:log'))).toBeNull();
  await page.locator('#btn-skip').click();
  await expect(stage(page)).toHaveAttribute('data-phase', 'focus');
  await mainBtn(page).click();
  await page.clock.fastForward('03:00');
  await page.keyboard.press('n');
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('ft:log')));
  expect(log).toHaveLength(1);
  expect(log[0].s).toBe(180);
});

test('flowtime counts up and sizes the break from the focus', async ({ page }) => {
  await page.locator('.chip[data-preset="flowtime"]').click();
  await expect(time(page)).toHaveText('00:00');
  await expect(page.locator('#hint')).toContainText('Finish');
  await mainBtn(page).click();
  await page.clock.fastForward('50:00');
  await expect(time(page)).toHaveText('50:00');
  await expect(page.locator('#btn-skip')).toHaveAttribute('aria-label', 'Finish');
  await page.locator('#btn-skip').click();
  await expect(stage(page)).toHaveAttribute('data-phase', 'short');
  await expect(time(page)).toHaveText(/^(10:00|09:59)$/);
});

test('tabata chains prep, work and rest automatically', async ({ page }) => {
  await page.locator('.chip[data-preset="tabata"]').click();
  await expect(page.locator('#phase-label')).toHaveText('Get ready');
  await expect(time(page)).toHaveText('00:10');
  await mainBtn(page).click();
  await page.clock.fastForward('00:11');
  await expect(page.locator('#phase-label')).toHaveText('Work');
  await expect(stage(page)).toHaveAttribute('data-status', 'running');
  await expect(page.locator('#sub')).toHaveText('Round 1 / 8');
  await page.clock.fastForward('00:20');
  await expect(page.locator('#phase-label')).toHaveText('Rest');
  // run to the end: 7 more work/rest pairs + final work
  await page.clock.fastForward('04:00');
  await expect(stage(page)).toHaveAttribute('data-phase', 'done');
  await expect(mainBtn(page)).toHaveText('Again');
  await expect(page.locator('#dots .dot.on')).toHaveCount(8);
  await mainBtn(page).click();
  await expect(page.locator('#phase-label')).toHaveText('Get ready');
});

test('stopwatch and timebox', async ({ page }) => {
  await page.keyboard.press('9');
  await expect(page.locator('.chip[aria-pressed="true"]')).toHaveText(/Stopwatch/);
  await page.keyboard.press('Space');
  await page.clock.fastForward('01:05:07');
  await expect(time(page)).toHaveText('1:05:07');
  await page.keyboard.press('8');
  await expect(page.locator('.chip[aria-pressed="true"]')).toHaveText(/Timebox/);
  await expect(time(page)).toHaveText('30:00');
  await page.keyboard.press('Space');
  await page.clock.fastForward('30:01');
  await expect(stage(page)).toHaveAttribute('data-phase', 'done');
});

test('settings: change focus length, reset to defaults, switch language and theme', async ({ page }) => {
  await page.locator('#btn-settings').click();
  const dlg = page.locator('#dlg-settings');
  await expect(dlg).toBeVisible();
  const focus = dlg.locator('input[data-field="focus"]');
  await expect(focus).toHaveValue('25');
  await focus.fill('45');
  await focus.press('Tab');
  await expect(time(page)).toHaveText('45:00');
  await expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ft:overrides')))).toEqual({ pomodoro: { focus: 2700 } });
  // out of range values are clamped
  await focus.fill('9999');
  await focus.press('Tab');
  await expect(focus).toHaveValue('600');
  await dlg.locator('#btn-defaults').click();
  await expect(focus).toHaveValue('25');
  await expect(time(page)).toHaveText('25:00');

  await dlg.locator('select[data-setting="lang"]').selectOption('tr');
  await expect(dlg.locator('h2')).toHaveText('Ayarlar');
  await expect(page.locator('#phase-label')).toHaveText('Odak');
  await expect(page.locator('.chip[data-preset="timebox"]')).toContainText('Zaman Kutusu');

  await dlg.locator('select[data-setting="theme"]').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await dlg.locator('button[value="close"]').click();
  await expect(dlg).toBeHidden();
  await expect(mainBtn(page)).toHaveText('Başlat');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(mainBtn(page)).toHaveText('Başlat');
});

test('auto-start focus setting chains focus after a break', async ({ page }) => {
  await page.locator('#btn-settings').click();
  await page.locator('input[data-setting="autoFocus"]').check();
  await page.locator('#dlg-settings button[value="close"]').click();
  await mainBtn(page).click();
  await page.clock.fastForward('30:01');
  await expect(stage(page)).toHaveAttribute('data-phase', 'focus');
  await expect(stage(page)).toHaveAttribute('data-status', 'running');
  await expect(time(page)).toHaveText('24:59');
});

test('stats dialog shows today, week and streak', async ({ page }) => {
  await page.evaluate((t0) => {
    const DAY = 86400000;
    localStorage.setItem('ft:log', JSON.stringify([
      { t: t0 - 2 * DAY, p: 'pomodoro', s: 1500 },
      { t: t0 - DAY, p: 'pomodoro', s: 3000 },
      { t: t0 - 60000, p: 'fiftytwo', s: 3120 },
    ]));
  }, T0);
  await page.reload();
  await page.keyboard.press('i');
  const dlg = page.locator('#dlg-stats');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('.stat').nth(0)).toContainText('52 m');
  await expect(dlg.locator('.stat').nth(1)).toContainText('2 h 7 m');
  await expect(dlg.locator('.stat').nth(2)).toContainText('3 sessions');
  await expect(dlg.locator('.bar')).toHaveCount(7);
  await expect(dlg).toContainText('3-day streak');
});

test('has no console errors and a valid manifest', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.reload();
  await page.locator('.chip[data-preset="eyes"]').click();
  await mainBtn(page).click();
  await page.clock.fastForward('20:01');
  await expect(page.locator('#phase-label')).toHaveText('Look away');
  expect(errors).toEqual([]);
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.icons.length).toBeGreaterThanOrEqual(2);
  for (const icon of m.icons) expect((await request.get('/' + icon.src)).ok()).toBe(true);
});
