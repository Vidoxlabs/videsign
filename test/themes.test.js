const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parseFrontMatter, emitThemeCSS} = require('../scripts/generate-tokens');
const {accentLabelProblems, lintFragment} = require('../scripts/lint-preview');
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
});
test('breakpoint and state prefixes use the smallest size and weight', () => {
  const onAccentClass = 'text-text-content-on-accent-base';
  const fillClass = 'bg-surface-accent-violet-base';
  const needs = 'bold xl or larger, or 2xl or larger';
  const label = (classes) => accentLabelProblems(`<button class="${fillClass} ${onAccentClass} ${classes}">Go</button>`);
  const fourteen = label('font-typography-weight-bold-base text-[14px]');
  const normal = label('font-typography-weight-regular-base text-typography-size-xl-base');
  const small = label('font-bold text-sm');
  const px24 = label('text-[24px]');
  const boldLg = label('text-lg font-bold');
  const prefixedBoldOnly = label('text-xl sm:font-bold');
  assert.ok(fourteen.some((problem) => problem.includes('text-[14px]') && problem.includes(needs)), fourteen.join(' | '));
  assert.ok(normal.some((problem) => problem.includes('weight 400') && problem.includes(needs)), normal.join(' | '));
  assert.ok(small.some((problem) => problem.includes('text-sm') && problem.includes(needs)), small.join(' | '));
  assert.deepEqual(px24, []);
  assert.ok(boldLg.some((problem) => problem.includes('text-lg') && problem.includes(needs)), boldLg.join(' | '));
  assert.ok(prefixedBoldOnly.some((problem) => problem.includes('weight 400') && problem.includes(needs)), prefixedBoldOnly.join(' | '));
  assert.deepEqual(label('font-typography-weight-bold-base text-typography-size-xl-base'), []);
  assert.deepEqual(label('text-typography-size-2xl-base'), []);
  const prefixedSmall = label('font-typography-weight-bold-base text-typography-size-xl-base md:text-sm');
  const prefixedNormal = label('font-typography-weight-bold-base text-typography-size-xl-base sm:font-normal');
  const hoverSmall = label('font-typography-weight-bold-base text-typography-size-xl-base hover:text-sm');
  const groupNormal = label('font-typography-weight-bold-base text-typography-size-xl-base group-hover:font-normal');
  const onlyMd = label('md:text-2xl md:font-bold');
  const onlySm = label('sm:text-xl sm:font-bold');
  assert.ok(prefixedSmall.some((problem) => problem.includes('md:text-sm') && problem.includes(needs)), prefixedSmall.join(' | '));
  assert.ok(prefixedNormal.some((problem) => problem.includes('weight 400') && problem.includes(needs)), prefixedNormal.join(' | '));
  assert.ok(hoverSmall.some((problem) => problem.includes('hover:text-sm') && problem.includes(needs)), hoverSmall.join(' | '));
  assert.ok(groupNormal.some((problem) => problem.includes('weight 400') && problem.includes(needs)), groupNormal.join(' | '));
  assert.ok(onlyMd.some((problem) => problem.includes(needs)), onlyMd.join(' | '));
  assert.ok(onlySm.some((problem) => problem.includes(needs)), onlySm.join(' | '));
  assert.deepEqual(label('text-xl font-bold md:text-2xl'), []);
  const nested = accentLabelProblems(`<button class="${fillClass} ${onAccentClass} text-xl font-bold"><span class="text-sm font-normal">Go</span></button>`);
  const persona = accentLabelProblems(`<button class="bg-persona-accent-violet-base ${onAccentClass} text-sm font-normal">Go</button>`);
  const opaque = accentLabelProblems(`<button class="bg-surface-accent-violet-base/90 ${onAccentClass} text-sm font-normal">Go</button>`);
  const quoted = accentLabelProblems(`<button class='${fillClass} ${onAccentClass} text-sm font-normal'>Go</button>`);
  const hoverFill = accentLabelProblems(`<button class="hover:${fillClass} ${onAccentClass} text-sm font-normal">Go</button>`);
  assert.ok(nested.some((problem) => problem.includes('text-sm') && problem.includes(needs)), nested.join(' | '));
  assert.ok(persona.some((problem) => problem.includes(needs)), persona.join(' | '));
  assert.ok(opaque.some((problem) => problem.includes(needs)), opaque.join(' | '));
  assert.ok(quoted.some((problem) => problem.includes(needs)), quoted.join(' | '));
  assert.ok(hoverFill.some((problem) => problem.includes(needs)), hoverFill.join(' | '));
  const upperClass = accentLabelProblems(`<button CLASS="${fillClass} ${onAccentClass} text-sm font-normal">Go</button>`);
  const importantSize = label('font-bold text-xl !text-sm');
  const importantFill = accentLabelProblems(`<button class="!${fillClass} ${onAccentClass} text-sm font-normal">Go</button>`);
  const missingToken = accentLabelProblems(`<button class="${fillClass} text-xl font-bold text-text-content-primary-base">Go</button>`);
  const inputSubmit = accentLabelProblems(`<input type="submit" value="Go" class="${fillClass} ${onAccentClass} text-sm font-normal">`);
  const buttonSmall = accentLabelProblems(`<button class="${fillClass} ${onAccentClass} text-sm font-normal">Go</button>`);
  const viaLint = lintFragment('bad.html', `<button class="${fillClass} ${onAccentClass} text-sm font-normal">Go</button>`);
  assert.ok(upperClass.some((problem) => problem.includes(needs)), upperClass.join(' | '));
  assert.ok(importantSize.some((problem) => problem.includes('!text-sm') && problem.includes(needs)), importantSize.join(' | '));
  assert.ok(importantFill.some((problem) => problem.includes(needs)), importantFill.join(' | '));
  assert.ok(missingToken.some((problem) => problem.includes(onAccentClass)), missingToken.join(' | '));
  assert.ok(inputSubmit.some((problem) => problem.includes(needs)), inputSubmit.join(' | '));
  assert.ok(buttonSmall.some((problem) => problem.includes(needs)), buttonSmall.join(' | '));
  assert.ok(viaLint.some((problem) => problem.includes(needs)), viaLint.join(' | '));
  const everyBreakpoint = ['', 'sm:', 'md:', 'lg:', 'xl:', '2xl:'].flatMap((prefix) => [
    `${prefix}font-typography-weight-bold-base`,
    `${prefix}text-typography-size-xl-base`,
  ]);
  assert.deepEqual(label(everyBreakpoint.join(' ')), []);
  assert.ok(accentLabelProblems('<a class="bg-surface-accent-violet-base/30 text-typography-size-xs-base">Research</a>').some((problem) => problem.includes(needs)));
  for (const file of ['button.html', 'question-bar.html', 'persona-console.html', 'island-nav.html']) {
    const html = fs.readFileSync(path.join(__dirname, '../preview', file), 'utf8');
    assert.deepEqual(accentLabelProblems(html), [], file);
  }
});
function accentButton(classes) {
  return accentLabelProblems(`<button class="bg-surface-accent-violet-base ${classes}">Go</button>`);
}

test('on-accent only under hover is denied', () => {
  const problems = accentButton('text-xl font-bold text-text-content-secondary-base hover:text-text-content-on-accent-base');
  assert.ok(problems.some((problem) => problem.includes('text-text-content-on-accent-base')), problems.join(' | '));
});

test('on-accent only under md is denied', () => {
  const problems = accentButton('text-xl font-bold md:text-text-content-on-accent-base');
  assert.ok(problems.some((problem) => problem.includes('text-text-content-on-accent-base')), problems.join(' | '));
});

test('on-accent only under focus is denied', () => {
  const problems = accentButton('text-xl font-bold focus:text-text-content-on-accent-base');
  assert.ok(problems.some((problem) => problem.includes('text-text-content-on-accent-base')), problems.join(' | '));
});

test('bold only under hover is denied', () => {
  const problems = accentButton('text-xl text-text-content-on-accent-base hover:font-bold');
  assert.ok(problems.some((problem) => problem.includes('bold xl or larger, or 2xl or larger')), problems.join(' | '));
});

test('size only under md is denied', () => {
  const problems = accentButton('font-bold text-text-content-on-accent-base md:text-2xl');
  assert.ok(problems.some((problem) => problem.includes('bold xl or larger, or 2xl or larger')), problems.join(' | '));
});

test('stacked md:hover prefix is denied', () => {
  const problems = accentButton('font-bold text-text-content-on-accent-base md:hover:text-2xl');
  assert.ok(problems.some((problem) => problem.includes('bold xl or larger, or 2xl or larger')), problems.join(' | '));
});

test('base that meets the rule may add prefixed variants', () => {
  assert.deepEqual(accentButton('text-xl font-bold text-text-content-on-accent-base md:text-2xl hover:font-bold'), []);
});

test('on-accent only under md:hover is denied', () => {
  const problems = accentButton('text-xl font-bold md:hover:text-text-content-on-accent-base');
  assert.ok(problems.some((problem) => problem.includes('text-text-content-on-accent-base')), problems.join(' | '));
});

test('empty child on-accent does not rescue a dark label', () => {
  const problems = accentLabelProblems('<button class="bg-surface-accent-violet-base text-xl font-bold text-text-content-secondary-base">Go<i class="text-text-content-on-accent-base"></i></button>');
  assert.ok(problems.some((problem) => problem.includes('text-text-content-on-accent-base')), problems.join(' | '));
});

test('on-accent only on a text child is denied', () => {
  const problems = accentLabelProblems('<button class="bg-surface-accent-violet-base text-xl font-bold text-text-content-secondary-base"><span class="text-text-content-on-accent-base">Go</span></button>');
  assert.ok(problems.some((problem) => problem.includes('text-text-content-on-accent-base')), problems.join(' | '));
});

test('empty child classes do not change a passing label', () => {
  assert.deepEqual(accentLabelProblems('<button class="bg-surface-accent-violet-base text-xl font-bold text-text-content-on-accent-base">Go<i class="text-sm"></i></button>'), []);
});

test('accent fill only under md is denied', () => {
  const problems = accentLabelProblems('<button class="md:bg-surface-accent-violet-base text-sm">Go</button>');
  assert.ok(problems.some((problem) => problem.includes('bold xl or larger, or 2xl or larger')), problems.join(' | '));
});

test('accent fill only under lg is denied', () => {
  const problems = accentLabelProblems('<button class="lg:bg-surface-accent-violet-base text-sm font-bold">Go</button>');
  assert.ok(problems.some((problem) => problem.includes('bold xl or larger, or 2xl or larger')), problems.join(' | '));
});

test('accent fill only under a breakpoint is denied', () => {
  for (const prefix of ['sm:', 'xl:', '2xl:', 'dark:']) {
    const problems = accentLabelProblems(`<button class="${prefix}bg-surface-accent-violet-base text-sm">Go</button>`);
    assert.ok(problems.some((problem) => problem.includes('bold xl or larger, or 2xl or larger')), `${prefix} ${problems.join(' | ')}`);
  }
});

test('breakpoint fill that meets the rule is allowed', () => {
  assert.deepEqual(accentLabelProblems('<button class="md:bg-surface-accent-violet-base text-xl font-bold text-text-content-on-accent-base">Go</button>'), []);
});

const needsLarge = 'bold xl or larger, or 2xl or larger';
const onAccent = 'text-text-content-on-accent-base';
const accentFill = 'bg-surface-accent-violet-base';

test('direct text without size is denied beside a bold xl child', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent}">Go<span class="text-xl font-bold">Now</span></button>`);
  assert.ok(problems.some((problem) => problem.includes(needsLarge)), problems.join(' | '));
});

test('mixed direct text beside a compliant child is denied', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent}">Go <span class="text-xl font-bold">Now</span> today</button>`);
  assert.ok(problems.some((problem) => problem.includes(needsLarge)), problems.join(' | '));
});

test('nested child without size is denied when the fill has direct text', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold">Go<span><em>More</em></span></button>`);
  assert.ok(problems.some((problem) => problem.includes(needsLarge)), problems.join(' | '));
});

test('fill with bold xl and no direct text is allowed', () => {
  assert.deepEqual(accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold"><span>Go</span></button>`), []);
});

test('whitespace before a child is not direct text', () => {
  assert.deepEqual(accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold"> <span>Go</span></button>`), []);
});

test('compliant child does not rescue a fill without size', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent}"><span class="text-xl font-bold">Go</span></button>`);
  assert.ok(problems.some((problem) => problem.includes(needsLarge)), problems.join(' | '));
});

test('small child is denied when the fill has no direct text', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold"><span class="text-sm">Go</span></button>`);
  assert.ok(problems.some((problem) => problem.includes(needsLarge)), problems.join(' | '));
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
