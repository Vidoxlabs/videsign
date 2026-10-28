const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {parseFrontMatter, emitThemeCSS, emitTailwindConfig} = require('../scripts/generate-tokens');
const root = path.join(__dirname, '..');
const tokens = parseFrontMatter(fs.readFileSync(path.join(root, 'DESIGN.md'), 'utf8'));
const luminance = (hex) => hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast = (a,b) => { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
test('both themes support readable text on every reading surface', () => {
  for (const suffix of ['base','light']) for (const surface of ['primary','secondary','tertiary']) for (const text of ['primary','secondary']) {
    const ratio=contrast(tokens.colors[`text-content-${text}-${suffix}`],tokens.colors[`surface-background-${surface}-${suffix}`]);
    assert.ok(ratio>=4.5,`${suffix} ${text} on ${surface}: ${ratio}`);
  }
});
test('on-accent text remains readable through all CTA states', () => {
  for (const state of ['base','hover','active']) assert.ok(contrast(tokens.colors['text-content-on-accent-base'],tokens.colors[`surface-accent-violet-${state}`])>=4.5);
});
test('theme generation is deterministic and offers solid light and forced-color fallbacks', () => {
  assert.equal(typeof emitThemeCSS, 'function');
  const css=emitThemeCSS(tokens);
  assert.equal(css,emitThemeCSS(tokens));
  assert.match(css,/data-theme="light"/);
  assert.match(css,/backdrop-filter: none/);
  assert.match(css,/forced-colors: active/);
  assert.match(css,/background: Canvas/);
});
test('each light colour maps onto its base variable', () => {
  const css = emitThemeCSS(tokens);
  const light = Object.entries(tokens.colors).filter(([key]) => key.endsWith('-light'));
  assert.ok(light.length > 0);
  for (const [key, value] of light) {
    const baseKey = `${key.slice(0, -'-light'.length)}-base`;
    assert.equal(Object.hasOwn(tokens.colors, baseKey), true, baseKey);
    assert.ok(css.includes(`--vi-colors-${baseKey}: ${value};`), `${baseKey} ${value}`);
  }
});
test('the token build writes dist/themes.css', () => {
  const out = path.join(root, 'dist', 'themes.css');
  fs.rmSync(out, {force: true});
  execFileSync(process.execPath, [path.join(root, 'scripts', 'generate-tokens.js')], {cwd: root, stdio: 'pipe'});
  assert.equal(fs.readFileSync(out, 'utf8'), emitThemeCSS(tokens));
});
test('the light glass block pins border, rim, and blur', () => {
  const css = emitThemeCSS(tokens);
  const start = css.indexOf('[data-theme="light"] .vi-glass,');
  const end = css.indexOf('\n}', start);
  assert.ok(start >= 0 && end > start);
  const block = css.slice(start, end);
  const solid = tokens.effects['glass-crystal-solid-light'];
  const rim = tokens.effects['glass-crystal-rim-light'];
  assert.ok(block.includes(`background: ${solid};`));
  assert.ok(block.includes('border: 0;'), block);
  assert.ok(block.includes(`box-shadow: inset 0 0 0 1px ${rim};`));
  assert.ok(block.includes('backdrop-filter: none;'));
  assert.ok(block.includes('-webkit-backdrop-filter: none;'));
  assert.equal(block.includes('blur('), false);
});
test('tailwind colors reference variables instead of literal hex', () => {
  const module_ = {exports: {}};
  new Function('module', emitTailwindConfig(tokens))(module_);
  const colors = module_.exports.theme.extend.colors;
  for (const key of Object.keys(tokens.colors)) {
    assert.equal(
      colors[key],
      `color-mix(in srgb, var(--vi-colors-${key}) calc(<alpha-value> * 100%), transparent)`,
    );
    assert.equal(String(colors[key]).includes('#'), false);
  }
});
