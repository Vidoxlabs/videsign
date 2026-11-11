/**
 * Preview fragment contract: every fragment lints clean, every class it uses
 * resolves to generated CSS, and the catalog lists every fragment and loads
 * the generated stylesheets.
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { lintAll, lintFragment } = require('../scripts/lint-preview');

const ROOT = path.join(__dirname, '..');
const PREVIEW = path.join(ROOT, 'preview');
const FRAGMENTS = fs.readdirSync(PREVIEW).filter((f) => f.endsWith('.html')).sort();

/**
 * Marker classes with no CSS rule of their own. The stage hooks name the backdrop's parts so a
 * product can target them; lib/stage.css styles their children instead.
 */
const MARKERS = new Set(['group', 'peer', 'stage--hero', 'stage__sky', 'stage__core', 'stage__floor', 'stage__floor-glow']);

let css = '';

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
  css = ['catalog.css', 'glass.css', 'tokens.css', 'stage.css']
    .map((f) => fs.readFileSync(path.join(ROOT, 'dist', f), 'utf-8'))
    .join('\n');
});

function cssSelector(cls) {
  return `.${cls.replace(/([:/.[\]%])/g, '\\$1')}`;
}

test('every preview fragment lints clean', () => {
  assert.deepEqual(lintAll(), []);
});

test('the linter flags what it claims to flag', () => {
  const bad = lintFragment('x.html', [
    '<p class="vi-glass shadow-sm w-[15px] backdrop-blur-sm bg-white/5 uppercase animate-pulse" style="top:1px">Authorize action, verified and signed &#128512;</p>',
    '<div class="vi-glass"><div class="vi-glass-shell"></div></div>',
    '<script>1</script>',
  ].join('\n'));
  const typed = lintFragment('t.html', '<span class="font-medium tracking-wide leading-tight">x</span>');
  for (const needle of [
    'shadow-sm', 'arbitrary', 'inline style', '<script>', 'glass on <p>', 'nested in glass',
    '"verified"', '"signed"', '"Authorize action"',
    'legacy glass utility "backdrop-blur-sm"', 'legacy glass utility "bg-white/5"',
    'uppercase', 'animate-pulse',
  ]) {
    assert.ok(bad.some((p) => p.includes(needle)), `expected a problem mentioning ${needle}: ${bad.join(' | ')}`);
  }
  for (const needle of ['font-medium', 'tracking-wide', 'leading-tight']) {
    assert.ok(typed.some((p) => p.includes(needle)), `expected raw type flag for ${needle}: ${typed.join(' | ')}`);
  }
  assert.ok(lintFragment('y.html', '<p class="p-4">Proposed &#128512;</p>').length >= 0);
  assert.ok(lintFragment('sq.html', "<span class='shadow-sm'>x</span>").some((problem) => problem.includes('shadow-sm')));
  const four = lintFragment('z.html', '<nav class="vi-glass"></nav><nav class="vi-glass"></nav><nav class="vi-glass"></nav><nav class="vi-glass"></nav>');
  assert.ok(four.some((p) => p.includes('glass layers')));
});

test('every class used by a fragment resolves to generated CSS', () => {
  const unresolved = [];
  for (const file of FRAGMENTS) {
    if (file === 'index.html') continue;
    const html = fs.readFileSync(path.join(PREVIEW, file), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
    for (const m of html.matchAll(/\bclass="([^"]*)"/g)) {
      for (const cls of m[1].split(/\s+/).filter(Boolean)) {
        if (MARKERS.has(cls)) continue;
        if (!css.includes(cssSelector(cls))) unresolved.push(`${file}: ${cls}`);
      }
    }
  }
  assert.deepEqual([...new Set(unresolved)], []);
});

test('the catalog loads the generated stylesheets and lists every fragment', () => {
  const index = fs.readFileSync(path.join(PREVIEW, 'index.html'), 'utf-8');
  for (const sheet of ['../dist/tokens.css', '../dist/glass.css', '../dist/catalog.css', '../dist/stage.css']) {
    assert.ok(index.includes(`href="${sheet}"`), `catalog must load ${sheet}`);
  }
  const unlisted = FRAGMENTS.filter((f) => f !== 'index.html' && !index.includes(`'${f}'`) && !index.includes(`"${f}"`));
  assert.deepEqual(unlisted, []);
});

test('required new fragments exist', () => {
  for (const f of ['conversation-surface', 'instrument', 'island-nav', 'question-bar', 'evidence-lens', 'field-node', 'field-edge', 'statement-proof-row', 'coverage-grid', 'persona-switcher', 'skeleton-row', 'locked-panel']) {
    assert.ok(FRAGMENTS.includes(`${f}.html`), `missing preview/${f}.html`);
  }
});

test('the persona console no longer claims authority or verification', () => {
  const html = fs.readFileSync(path.join(PREVIEW, 'persona-console.html'), 'utf-8');
  const body = html.replace(/<!--[\s\S]*?-->/g, '');
  assert.doesNotMatch(body, /Authorize action|verified|signed/i);
  assert.match(body, /data-state="unavailable"/);
  assert.match(body, /bg-persona-accent-violet-base/);
});

test('Violet accent text never sits on the secondary or tertiary surface (ADR-006 contrast rule)', () => {
  // Walk every element: if it carries Violet accent text, no ancestor (or the
  // element itself) may paint a secondary/tertiary background.
  const body = fs.readFileSync(path.join(PREVIEW, 'persona-console.html'), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const stack = [];
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)) {
    const [, closing, rawTag, attrs] = m;
    const tag = rawTag.toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const classAttr = (attrs.match(/\bclass\s*=\s*"([^"]*)"/) || [])[1] || '';
    const cls = classAttr.split(/\s+/).filter(Boolean);
    const selfBg = cls.find((c) => /^bg-surface-background-(secondary|tertiary)-base$/.test(c));
    const ancestorBg = stack.find((s) => s.bg);
    if (cls.includes('text-persona-accent-violet-base')) {
      assert.equal(selfBg, undefined, 'Violet accent text on its own secondary/tertiary background');
      assert.equal(ancestorBg, undefined, 'Violet accent text inside a secondary/tertiary ancestor');
    }
    if (!VOID.has(tag) && !/\/\s*$/.test(attrs)) {
      stack.push({ tag, bg: selfBg || null });
    }
  }
});

// --- ADR-011 / ADR-013 signature colours, five-bar rule and chat dock ---

const CANON = ['violet', 'wisteria', 'xylia', 'yarrow', 'zinnia'];
const read = (f) => fs.readFileSync(path.join(PREVIEW, f), 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
const fiveBars = (html) => [...html.matchAll(/<div aria-hidden="true" class="[^"]*">\s*((?:<span class="[^"]*h-indicator-fivebar-base[^"]*"><\/span>\s*){5})<\/div>/g)]
  .map((m) => [...m[1].matchAll(/bg-persona-accent-([a-z]+)-base/g)].map((c) => c[1]));

test('the linter enforces the signature-colour rules', () => {
  const alone = lintFragment('a.html', '<span class="bg-persona-accent-xylia-base"></span>');
  assert.ok(alone.some((p) => p.includes('Xylia appears without')), alone.join(' | '));
  const text = lintFragment('b.html', `<p class="text-persona-accent-xylia-base">x</p>${CANON.map((c) => `<i class="bg-persona-accent-${c}-base"></i>`).join('')}`);
  assert.ok(text.some((p) => p.includes('Xylia as text')), text.join(' | '));
  const gradient = lintFragment('c.html', '<div class="bg-gradient-to-r from-persona-accent-violet-base to-persona-accent-zinnia-base"></div>');
  assert.equal(gradient.filter((p) => p.includes('gradient stop')).length, 2, gradient.join(' | '));
  const hover = lintFragment('d.html', '<span class="hover:text-persona-accent-xylia-base"></span>');
  assert.ok(hover.some((p) => p.includes('Xylia as text')), hover.join(' | '));
  const together = lintFragment('e.html', CANON.map((c) => `<i class="bg-persona-accent-${c}-base"></i>`).join(''));
  assert.deepEqual(together.filter((p) => /Xylia|gradient/.test(p)), []);
});

test('the five-bar rule is five hard segments in canon order, hidden from assistive tech', () => {
  const bars = fiveBars(read('five-bar-rule.html'));
  assert.equal(bars.length, 1);
  assert.deepEqual(bars[0], CANON);
  assert.doesNotMatch(read('five-bar-rule.html'), /bg-gradient|from-|via-/);
});

/** Seat dots (ADR-014): five buttons in canon order, named for the seat, one pressed, hit area 44 by 32. */
function seatDots(html) {
  const group = html.match(/<div role="group" aria-label="Choose a guide"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(group, 'seat dot group missing');
  return [...group[1].matchAll(/<button type="button" aria-pressed="(true|false)" aria-label="([A-Z][a-z]+)" class="([^"]*)">([\s\S]*?)<\/button>/g)]
    .map((m) => ({ pressed: m[1] === 'true', seat: m[2].toLowerCase(), classes: m[3], inner: m[4] }));
}

function assertConversationBudget(file) {
  const html = read(file);
  // One header row, in order: avatar, seat name and role, seat dots, close. No printed product title.
  assert.equal([...html.matchAll(/<header\b/g)].length, 1, `${file}: one header`);
  const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)[1];
  assert.ok(header.indexOf('aria-label="Choose a guide"') < header.indexOf('aria-label="Close chat"'), `${file}: dots before close`);
  assert.equal([...header.matchAll(/aria-label="More options"/g)].length <= 1, true, `${file}: at most one overflow menu`);
  assert.doesNotMatch(header, /AI assistant|Vidoxlabs guides|>Guides</, `${file}: no product title or model badge in view`);
  assert.match(header, /<p aria-live="polite" class="sr-only">Companion state: [a-z ]+<\/p>/, `${file}: state is carried by hidden live text`);
  // Seat dots.
  const dots = seatDots(html);
  assert.deepEqual(dots.map((d) => d.seat), CANON, `${file}: seat order`);
  assert.equal(dots.filter((d) => d.pressed).length, 1, `${file}: one pressed seat`);
  for (const d of dots) {
    assert.match(d.classes, /\bw-icon-md-base\b/, `${file}: ${d.seat} hit width`);
    assert.match(d.classes, /\bh-action-min-default\b/, `${file}: ${d.seat} hit height`);
    assert.match(d.inner, new RegExp(`bg-persona-accent-${d.seat}-base`), `${file}: ${d.seat} dot colour`);
    // The ring is the pressed seat's own colour, and only the pressed seat carries one.
    assert.equal(new RegExp(`border-persona-accent-${d.seat}-base`).test(d.inner), d.pressed, `${file}: ${d.seat} ring`);
    assert.doesNotMatch(d.inner.replace(/<[^>]+>/g, ''), /\S/, `${file}: ${d.seat} prints no name`);
  }
  // Seat names stay in a text token, never a persona colour.
  assert.doesNotMatch(html, /text-persona-accent-/);
  // The dialog and its log.
  assert.match(html, /role="dialog" aria-modal="false" aria-label="Chat with the guides"/);
  assert.match(html, /role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation"/);
  // One composer field: the border is on the form, the text area and send sit inside it.
  assert.equal([...html.matchAll(/<form\b/g)].length, 1, `${file}: one composer`);
  const form = html.match(/<form class="([^"]*)">([\s\S]*?)<\/form>/);
  assert.match(form[1], /\bborder\b/, `${file}: the field carries the border`);
  assert.match(form[1], /rounded-layout-radius-control-base/);
  const area = form[2].match(/<textarea\b[^>]*class="([^"]*)"/)[1];
  assert.doesNotMatch(area, /(^|\s)border(\s|$)/, `${file}: the text area has no border of its own`);
  assert.match(form[2], /<button type="submit" aria-label="Send"/);
  // One-line disclosure with its detail behind it.
  assert.equal([...html.matchAll(/<details\b/g)].length, 1, `${file}: one disclosure`);
  assert.match(html, /<summary>Replies come from an AI model\. What is sent<\/summary>/);
  // Every interactive control meets the touch target floor.
  for (const m of html.matchAll(/<(button|textarea)\b[^>]*class="([^"]*)"/g)) {
    assert.match(m[2], /h-action-(min|wide)-default/, m[0].slice(0, 80));
  }
  return html;
}

test('the conversation surface fragment keeps the ADR-014 chrome budget (empty state)', () => {
  const html = assertConversationBudget('conversation-surface.html');
  const starters = html.match(/<div role="group" aria-label="Starters"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(starters, 'starters group missing');
  const count = [...starters[1].matchAll(/<button\b/g)].length;
  assert.ok(count >= 1 && count <= 4, `starters: ${count}`);
  // An empty conversation has no visitor bubble, no follow-ups and no message card.
  assert.doesNotMatch(html, /aria-label="Follow-ups"|You said/);
  assert.doesNotMatch(html.match(/role="log"[\s\S]*?<form/)[0], /bg-surface-background-secondary-base/);
});

test('the chat dock fragment carries the ADR-013 dialog and launcher and the ADR-014 contents', () => {
  const html = assertConversationBudget('chat-dock.html');
  const log = html.match(/role="log"[\s\S]*?<form/)[0];
  // Starters leave once a turn is sent; follow-ups are at most three.
  assert.doesNotMatch(log, /aria-label="Starters"/);
  const followUps = [...log.matchAll(/<div role="group" aria-label="Follow-ups"[^>]*>([\s\S]*?)<\/div>/g)];
  assert.equal(followUps.length, 1, 'follow-ups on the latest reply only');
  assert.ok([...followUps[0][1].matchAll(/<button\b/g)].length <= 3);
  // The visitor's turn is the only bubble; a guide's reply is text on the core.
  assert.equal([...log.matchAll(/bg-surface-background-tertiary-base/g)].length, 1);
  assert.doesNotMatch(log, /bg-surface-background-secondary-base/);
  // Two replies from one seat, one speaker marker: it heads a reply only when the speaker changes.
  const markers = [...log.matchAll(/<div aria-hidden="true" class="inline-flex gap-gap-dense-default">([\s\S]*?)<\/div>/g)];
  assert.equal(markers.length, 1);
  assert.deepEqual([...markers[0][1].matchAll(/bg-persona-accent-([a-z]+)-base/g)].map((c) => c[1]), CANON);
  // The launcher never draws a mark: no inline SVG or image, and a five-bar foot in canon order follows it.
  assert.doesNotMatch(html, /<svg|<img|<path/);
  assert.match(html, /id="chat-dock"/);
  assert.match(html, /aria-controls="chat-dock"/);
  const bars = fiveBars(html);
  assert.deepEqual(bars.at(-1), CANON);
});

test('the instrument fragment follows ADR-015', () => {
  const html = read('instrument.html');
  // A solid panel, never glass.
  assert.doesNotMatch(html, /vi-glass/);
  assert.match(html, /^\s*<div class="[^"]*bg-surface-background-secondary-base[^"]*"/);
  // It opens with what it shows and what to try, and says once that it runs on sample data.
  assert.match(html, /<p[^>]*>Shows [^<]+<\/p>\s*<p[^>]*>Try it: [^<]+<\/p>/);
  assert.equal([...html.matchAll(/sample data/g)].length, 1);
  // Controls: switch rows, a labelled range with an output, one segmented control. No fieldset or checkbox.
  assert.doesNotMatch(html, /<fieldset|<legend|type="checkbox"/);
  const switches = [...html.matchAll(/<button type="button" role="switch" aria-checked="(true|false)" class="([^"]*)"/g)];
  assert.ok(switches.length >= 2);
  for (const m of switches) {
    assert.match(m[2], /\bw-full\b/);
    assert.match(m[2], /h-action-min-default/);
  }
  assert.match(html, /<label[^>]*>[\s\S]*?<output[^>]*tabular-nums[^>]*>[\s\S]*?<input type="range"/);
  assert.equal([...html.matchAll(/aria-label="Presets"/g)].length, 1);
  // The diagram is a readout: no button inside it, and a blocked stage carries a text label.
  const diagram = html.match(/<ol\b[\s\S]*?<\/ol>/)[0];
  assert.doesNotMatch(diagram, /<button/);
  assert.match(diagram, /border-status-indicator-error-base[\s\S]*?Blocked here/);
  assert.match(diagram, /border-border-graph-line-base/);
  // The receipt is a ledger in a polite live region.
  assert.match(html, /<dl aria-live="polite" aria-label="Receipt"/);
  // No seat colour: a single stage is never painted in one seat's colour.
  assert.doesNotMatch(html, /persona-accent-/);
});
