const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parseFrontMatter, emitThemeCSS} = require('../scripts/generate-tokens');
const {accentLabelProblems} = require('../scripts/lint-preview');
const tokens = parseFrontMatter(fs.readFileSync(path.join(__dirname, '../DESIGN.md'), 'utf8'));
const luminance = (hex) => hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v,16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast = (a,b) => { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
test('both themes support readable text on every reading surface', () => {
  for (const suffix of ['base','light']) for (const surface of ['primary','secondary','tertiary']) for (const text of ['primary','secondary']) {
    const ratio=contrast(tokens.colors[`text-content-${text}-${suffix}`],tokens.colors[`surface-background-${surface}-${suffix}`]);
    assert.ok(ratio>=4.5,`${suffix} ${text} on ${surface}: ${ratio}`);
  }
});
test('on-accent text remains readable through all CTA states', () => {
  const onAccent = tokens.colors['text-content-on-accent-base'];
  const fill = tokens.colors['surface-accent-violet-base'];
  const rounded = (ratio) => Math.round(ratio * 100) / 100;
  assert.equal(fill, '#8B5CF6');
  assert.equal(rounded(contrast(onAccent, fill)), 4.23);
  assert.equal(rounded(contrast('#FFFFFF', fill)), 4.23);
  assert.equal(tokens.colors['surface-accent-violet-hover'], '#6D28D9');
  assert.equal(tokens.colors['surface-accent-violet-active'], '#5B21B6');
  for (const state of ['hover','active']) {
    assert.ok(contrast(onAccent, tokens.colors[`surface-accent-violet-${state}`]) >= 4.5);
    assert.ok(contrast('#FFFFFF', tokens.colors[`surface-accent-violet-${state}`]) >= 4.5);
  }
  const onAccentClass = 'text-text-content-on-accent-base';
  const fillClass = 'bg-surface-accent-violet-base';
  const needs = 'bold xl or larger, or 2xl or larger';
  const fourteen = accentLabelProblems(`<button class="${fillClass} ${onAccentClass} font-typography-weight-bold-base text-[14px]">Go</button>`);
  const normal = accentLabelProblems(`<button class="${fillClass} ${onAccentClass} font-typography-weight-regular-base text-typography-size-xl-base">Go</button>`);
  const small = accentLabelProblems(`<button class="${fillClass} ${onAccentClass} font-bold text-sm">Go</button>`);
  const px24 = accentLabelProblems(`<button class="${fillClass} ${onAccentClass} text-[24px]">Go</button>`);
  assert.ok(fourteen.some((problem) => problem.includes('text-[14px]') && problem.includes(needs)), fourteen.join(' | '));
  assert.ok(normal.some((problem) => problem.includes('weight 400') && problem.includes(needs)), normal.join(' | '));
  assert.ok(small.some((problem) => problem.includes('text-sm') && problem.includes(needs)), small.join(' | '));
  assert.ok(px24.some((problem) => problem.includes('text-[24px]') && problem.includes(needs)), px24.join(' | '));
  assert.deepEqual(accentLabelProblems(`<button class="${fillClass} ${onAccentClass} font-typography-weight-bold-base text-typography-size-xl-base">Go</button>`), []);
  assert.deepEqual(accentLabelProblems(`<button class="${fillClass} ${onAccentClass} text-typography-size-2xl-base">Go</button>`), []);
  const prefixedSmall = accentLabelProblems(`<button class="${fillClass} ${onAccentClass} font-typography-weight-bold-base text-typography-size-xl-base md:text-sm">Go</button>`);
  const prefixedNormal = accentLabelProblems(`<button class="${fillClass} ${onAccentClass} font-typography-weight-bold-base text-typography-size-xl-base sm:font-normal">Go</button>`);
  assert.ok(prefixedSmall.some((problem) => problem.includes('md:text-sm') && problem.includes(needs)), prefixedSmall.join(' | '));
  assert.ok(prefixedNormal.some((problem) => problem.includes('weight 400') && problem.includes(needs)), prefixedNormal.join(' | '));
  const everyBreakpoint = ['', 'sm:', 'md:', 'lg:', 'xl:', '2xl:'].flatMap((prefix) => [
    `${prefix}font-typography-weight-bold-base`,
    `${prefix}text-typography-size-xl-base`,
  ]);
  assert.deepEqual(accentLabelProblems(`<button class="${fillClass} ${onAccentClass} ${everyBreakpoint.join(' ')}">Go</button>`), []);
  assert.deepEqual(accentLabelProblems('<a class="bg-surface-accent-violet-base/30 text-typography-size-xs-base">Research</a>'), []);
  for (const file of ['button.html', 'question-bar.html', 'persona-console.html', 'island-nav.html']) {
    const html = fs.readFileSync(path.join(__dirname, '../preview', file), 'utf8');
    assert.deepEqual(accentLabelProblems(html), [], file);
  }
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
