// Browser smoke test of the main flows with a fake Piper voice (speech-to-text is skipped).
// Usage: npm run dev -- --port 5174, then: node scripts/e2e-smoke.cjs <dir with fake-voice.onnx(.json) for screenshots>
const { chromium, devices } = require('playwright');
const S = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  await ctx.route(/huggingface\.co\/.*libritts_r.*\.onnx$/, r => r.fulfill({ path: S + '/fake-voice.onnx', headers: { 'access-control-allow-origin': '*' } }));
  await ctx.route(/huggingface\.co\/.*libritts_r.*\.onnx\.json$/, r => r.fulfill({ path: S + '/fake-voice.onnx.json', headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' } }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('http://localhost:5174/'); await p.waitForTimeout(2500); await p.reload(); await p.waitForTimeout(2500);
  console.log('isolated', await p.evaluate(() => crossOriginIsolated));
  await p.screenshot({ path: S + '/p2-onboarding.png' });
  for (let i = 0; i < 5; i++) { try { await p.waitForFunction(() => window.__mimicDev); await p.evaluate(() => window.__mimicDev.loadVoiceOnly()); break; } catch (e) { console.log('retry', e.message.slice(0, 80)); await p.waitForTimeout(2000); } }
  await p.waitForSelector('text=Hold to talk');
  await p.click('text=Rex Rumble');
  await p.fill('input[aria-label="Text for the character to say"]', 'Hello there, champion!');
  await p.click('button[type=submit]:has-text("Say it")');
  await p.waitForTimeout(4000);
  console.log('error?', await p.locator('.error').allTextContents(), 'talk btn', await p.textContent('.talk'));
  console.log('caption', await p.textContent('.caption'));
  await p.screenshot({ path: S + '/p2-talk.png' });
  await p.click('nav >> text=Clips'); await p.waitForTimeout(500);
  console.log('clips', await p.locator('.clip').count(), await p.locator('.clip-text strong').first().textContent());
  await p.screenshot({ path: S + '/p2-clips.png' });
  const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await p.click('.clip >> text=Share');
  const d = await dl; console.log('share fallback download', d ? d.suggestedFilename() : 'none (share sheet used?)');
  await p.click('nav >> text=Settings'); await p.waitForTimeout(500);
  await p.screenshot({ path: S + '/p2-settings.png', fullPage: true });
  await p.click('[aria-label="Next speaker"] >> nth=0');
  console.log('speaker now', await p.inputValue('input[aria-label="Speaker number"] >> nth=0'));
  await p.click('button:has-text("Preview") >> nth=0'); await p.waitForSelector('text=Playing…'); await p.waitForSelector('text=Playing…', { state: 'detached', timeout: 15000 });
  // import voice
  await p.setInputFiles('input[accept=".onnx"]', S + '/fake-voice.onnx');
  await p.setInputFiles('input[accept=".json,application/json"]', S + '/fake-voice.onnx.json');
  await p.fill('input[placeholder="e.g. My narrator"]', 'Test voice');
  await p.click('button:has-text("Import voice")'); console.log('no rights ->', await p.textContent('.import .error'));
  await p.check('.import input[type=checkbox]'); await p.click('button:has-text("Import voice")'); await p.waitForTimeout(500);
  console.log('import ->', await p.textContent('.import .notice'));
  await p.selectOption('select >> nth=1', { label: 'Imported: Test voice' });
  await p.click('button:has-text("Preview") >> nth=1'); await p.waitForSelector('text=Playing…'); await p.waitForSelector('text=Playing…', { state: 'detached', timeout: 15000 });
  console.log('imported preview ok');
  // reload keeps choices
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__mimicDev.loadVoiceOnly()); await p.click('nav >> text=Settings'); await p.waitForTimeout(500);
  console.log('persisted speaker', await p.inputValue('input[aria-label="Speaker number"] >> nth=0'), 'stella src', await p.inputValue('select >> nth=1') !== 'builtin');
  await p.click('text=Delete everything'); await p.click('text=Yes, delete everything');
  await p.waitForTimeout(3000);
  console.log('after wipe: onboarding?', await p.locator('text=Download voices').count(), 'clips db', await p.evaluate(async () => (await indexedDB.databases()).map(d => d.name)));
  console.log('errors', errs.filter(e => !/huggingface|whisper/i.test(e)).slice(0, 8));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
