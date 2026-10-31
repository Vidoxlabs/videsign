const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {parseFrontMatter, emitThemeCSS, emitTailwindConfig} = require('../scripts/generate-tokens');
const {accentLabelProblems, lintFragment} = require('../scripts/lint-preview');
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
  const onAccent = tokens.colors['text-content-on-accent-base'];
  const fill = tokens.colors['surface-accent-violet-base'];
  const rounded = (ratio) => Math.round(ratio * 100) / 100;
  assert.equal(fill, '#8B5CF6');
  assert.equal(rounded(contrast(onAccent, fill)), 4.23);
});
test('unprefixed classes set accent size and weight', () => {
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

test('prefixed size on the fill is not inherited by a weight-only child', () => {
  for (const size of ['md:text-xl', 'hover:text-xl']) {
    const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent} font-bold ${size}"><span class="font-bold">Go</span></button>`);
    assert.ok(problems.some((problem) => problem.includes(needsLarge)), `${size} ${problems.join(' | ')}`);
  }
});

test('prefixed weight on the fill is not inherited by a size-only child', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl hover:font-bold"><span class="text-xl">Go</span></button>`);
  assert.ok(problems.some((problem) => problem.includes(needsLarge)), problems.join(' | '));
});

test('stacked prefix on the fill does not supply size', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent} font-bold md:hover:text-xl"><span class="font-bold">Go</span></button>`);
  assert.ok(problems.some((problem) => problem.includes(needsLarge)), problems.join(' | '));
});

test('prefixed classes on a child do not supply the base', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent}"><span class="md:text-xl hover:font-bold">Go</span></button>`);
  assert.ok(problems.some((problem) => problem.includes(needsLarge)), problems.join(' | '));
});

test('dark prefixed size on the fill is not inherited', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent} font-bold dark:text-xl"><span class="font-bold">Go</span></button>`);
  assert.ok(problems.some((problem) => problem.includes(needsLarge)), problems.join(' | '));
});

test('prefixed downgrades on a compliant fill are denied', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold hover:text-sm md:text-sm"><span class="font-bold">Go</span></button>`);
  assert.ok(problems.some((problem) => problem.includes('hover:text-sm') && problem.includes(needsLarge)), problems.join(' | '));
  assert.ok(problems.some((problem) => problem.includes('md:text-sm') && problem.includes(needsLarge)), problems.join(' | '));
});

test('dark and max-md weight or size downgrades are denied', () => {
  const dark = accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold dark:font-normal">Go</button>`);
  const maxMd = accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold max-md:text-sm">Go</button>`);
  const regular = accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold md:font-regular">Go</button>`);
  const shrunk = accentLabelProblems(`<button class="${accentFill} ${onAccent} text-2xl sm:text-base">Go</button>`);
  const arbitrary = accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold [&]:text-sm">Go</button>`);
  assert.ok(dark.some((problem) => problem.includes('dark:font-normal') && problem.includes(needsLarge)), dark.join(' | '));
  assert.ok(maxMd.some((problem) => problem.includes('max-md:text-sm') && problem.includes(needsLarge)), maxMd.join(' | '));
  assert.ok(regular.some((problem) => problem.includes('md:font-regular') && problem.includes(needsLarge)), regular.join(' | '));
  assert.ok(shrunk.some((problem) => problem.includes('sm:text-base') && problem.includes(needsLarge)), shrunk.join(' | '));
  assert.ok(arbitrary.some((problem) => problem.includes('[&]:text-sm') && problem.includes(needsLarge)), arbitrary.join(' | '));
});

test('prefixed size on a child is a downgrade', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold"><span class="md:text-sm">Go</span></button>`);
  assert.ok(problems.some((problem) => problem.includes('md:text-sm') && problem.includes(needsLarge)), problems.join(' | '));
});

test('sr-only and visually-hidden children are not sized', () => {
  assert.deepEqual(accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold"><span class="sr-only text-sm">Go</span></button>`), []);
  assert.deepEqual(accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold"><span class="visually-hidden text-sm">Go</span></button>`), []);
});

test('emphasis inside a compliant fill is allowed', () => {
  assert.deepEqual(accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold">Go <em>now</em></button>`), []);
  assert.deepEqual(accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold">Go <strong>now</strong></button>`), []);
});

test('emphasis with a prefixed downgrade is denied', () => {
  const problems = accentLabelProblems(`<button class="${accentFill} ${onAccent} text-xl font-bold">Go<em class="md:text-sm">now</em></button>`);
  assert.ok(problems.some((problem) => problem.includes('md:text-sm') && problem.includes(needsLarge)), problems.join(' | '));
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
  assert.match(tokens.colors['border-separator-primary-light'], /^#[0-9A-Fa-f]{6}$/);
  const rimAlpha = rim.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)$/);
  assert.ok(rimAlpha, rim);
  assert.ok(Number(rimAlpha[1]) > 0, rim);
});
test('tailwind colors reference variables instead of literal hex', () => {
  const module_ = {exports: {}};
  new Function('module', emitTailwindConfig(tokens))(module_);
  const colors = module_.exports.theme.extend.colors;
  for (const key of Object.keys(tokens.colors)) {
    assert.equal(
      colors[key],
      `color-mix(in srgb, var(--vi-colors-${key}, ${tokens.colors[key]}) calc(<alpha-value> * 100%), transparent)`,
    );
  }
});
test('each tailwind colour keeps its hex as the var fallback', () => {
  const module_ = {exports: {}};
  new Function('module', emitTailwindConfig(tokens))(module_);
  const colors = module_.exports.theme.extend.colors;
  for (const [key, hex] of Object.entries(tokens.colors)) {
    assert.equal(colors[key].includes(`var(--vi-colors-${key}, ${hex})`), true, key);
  }
});
test('accent-fill CTAs use only the on-accent text token', () => {
  const preview = path.join(root, 'preview');
  const seen = [];
  const bad = [];
  for (const file of fs.readdirSync(preview).filter((name) => name.endsWith('.html')).sort()) {
    const html = fs.readFileSync(path.join(preview, file), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    for (const match of html.matchAll(/\bclass="([^"]*)"/g)) {
      const classes = match[1].split(/\s+/).filter(Boolean);
      if (!classes.includes('bg-surface-accent-violet-base')) continue;
      const textColors = classes.filter((cls) => /^(?:hover:|active:|focus:|focus-visible:)?text-(?!typography-)/.test(cls));
      if (textColors.length === 0) continue;
      seen.push(file);
      for (const cls of textColors) {
        if (!/^(?:hover:|active:|focus:|focus-visible:)?text-text-content-on-accent-base$/.test(cls)) {
          bad.push(`${file}: ${cls}`);
        }
      }
    }
  }
  assert.deepEqual(bad, []);
  assert.deepEqual(seen, ['button.html', 'island-nav.html', 'persona-console.html', 'question-bar.html']);
});
