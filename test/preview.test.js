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
 * product can target them; lib/stage.css styles their children instead. The memory field layer hooks (vi-mf-links, vi-mf-nodes) work the same way.
 */
const MARKERS = new Set(['group', 'peer', 'stage--hero', 'stage__sky', 'stage__core', 'stage__floor', 'stage__floor-glow', 'vi-mf-links', 'vi-mf-nodes']);

let css = '';

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], { cwd: ROOT, stdio: 'ignore' });
  css = ['catalog.css', 'glass.css', 'tokens.css', 'stage.css', 'memory-field.css', 'dialects.css']
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
  for (const sheet of ['../dist/tokens.css', '../dist/glass.css', '../dist/catalog.css', '../dist/stage.css', '../dist/memory-field.css', '../dist/dialects.css']) {
    assert.ok(index.includes(`href="${sheet}"`), `catalog must load ${sheet}`);
  }
  const unlisted = FRAGMENTS.filter((f) => f !== 'index.html' && !index.includes(`'${f}'`) && !index.includes(`"${f}"`));
  assert.deepEqual(unlisted, []);
});

test('required new fragments exist', () => {
  for (const f of ['conversation-surface', 'group-conversation', 'speaker-marker', 'receipt-ledger-row', 'turn-state-chip', 'owner-approval-gate', 'shared-desktop-catalog', 'artifact-lineage-reader', 'agent-roster-card', 'team-memory-notes', 'cross-team-handoff', 'usage-budget-meter', 'layout-agent-workspace', 'claim-maturity-badge', 'run-lifecycle-strip', 'tool-registry-row', 'public-repo-card', 'ecosystem-plane-map', 'site-header-island', 'site-footer', 'hero-billboard', 'filterable-catalog-grid', 'client-install-switcher', 'browser-check-runner', 'persona-companion-stage', 'evidence-exhibit-figure', 'design-studio-canvas', 'layout-public-site', 'systems-constellation-map', 'persona-deliberation-stepper', 'markdown-prose-renderer', 'code-and-diff-viewer', 'form-controls', 'button-variants', 'navigation-primitives', 'feedback-and-empty-states', 'disclosure-and-modals', 'starter-chips', 'instrument', 'island-nav', 'question-bar', 'evidence-lens', 'field-node', 'field-edge', 'statement-proof-row', 'coverage-grid', 'persona-switcher', 'skeleton-row', 'locked-panel']) {
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

/** Seat dots (ADR-016): five buttons in canon order, named for the seat, one pressed, hit area 44 by 44. */
function seatDots(html) {
  const group = html.match(/<div role="group" aria-label="Choose a guide"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(group, 'seat dot group missing');
  return [...group[1].matchAll(/<button type="button" aria-pressed="(true|false)" aria-label="([A-Z][a-z]+)" class="([^"]*)">([\s\S]*?)<\/button>/g)]
    .map((m) => ({ pressed: m[1] === 'true', seat: m[2].toLowerCase(), classes: m[3], inner: m[4] }));
}

function assertConversationBudget(file) {
  const html = read(file);
  // One header row: the name line (name, role, menu, close) and the seat dots beneath it. No printed product title.
  assert.equal([...html.matchAll(/<header\b/g)].length, 1, `${file}: one header`);
  const header = html.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)[1];
  assert.ok(header.indexOf('aria-label="Close chat"') < header.indexOf('aria-label="Choose a guide"'), `${file}: the dots sit on the second line`);
  assert.equal([...header.matchAll(/aria-label="More options"/g)].length <= 1, true, `${file}: at most one overflow menu`);
  assert.doesNotMatch(header, /AI assistant|Vidoxlabs guides|>Guides</, `${file}: no product title or model badge in view`);
  assert.match(header, /<p aria-live="polite" class="sr-only">Companion state: [a-z ]+<\/p>/, `${file}: state is carried by hidden live text`);
  // Seat dots.
  const dots = seatDots(html);
  assert.deepEqual(dots.map((d) => d.seat), CANON, `${file}: seat order`);
  assert.equal(dots.filter((d) => d.pressed).length, 1, `${file}: one pressed seat`);
  for (const d of dots) {
    assert.match(d.classes, /\bw-action-min-default\b/, `${file}: ${d.seat} hit width`);
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

test('the conversation surface fragment keeps the ADR-016 chrome budget (empty state)', () => {
  const html = assertConversationBudget('conversation-surface.html');
  const starters = html.match(/<div role="group" aria-label="Starters"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(starters, 'starters group missing');
  const count = [...starters[1].matchAll(/<button\b/g)].length;
  assert.ok(count >= 1 && count <= 4, `starters: ${count}`);
  // An empty conversation has no visitor bubble, no follow-ups and no message card.
  assert.doesNotMatch(html, /aria-label="Follow-ups"|You said/);
  assert.doesNotMatch(html.match(/role="log"[\s\S]*?<form/)[0], /bg-surface-background-secondary-base/);
});

test('the chat dock fragment carries the ADR-013 dialog and launcher and the ADR-016 contents', () => {
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

test('the instrument fragment follows ADR-017', () => {
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

test('the group-conversation fragment follows ADR-020', () => {
  const html = read('group-conversation.html');
  // Persona accent ban and no solid violet fill (rings use border-surface-accent-violet-base).
  assert.doesNotMatch(html, /persona-accent-/);
  assert.doesNotMatch(html, /bg-surface-accent-violet-base/);
  // Dialog, glass shell + core, one header, one log, one composer, one disclosure.
  assert.match(html, /role="dialog" aria-modal="false" aria-label="Agent harness thread"/);
  assert.match(html, /\bvi-glass-shell\b[\s\S]*\bw-layout-width-conversation-base\b/);
  assert.match(html, /\bvi-glass-core\b/);
  assert.equal([...html.matchAll(/<header\b/g)].length, 1);
  assert.match(html, /role="log" aria-live="polite" aria-relevant="additions" aria-label="Group conversation"/);
  assert.equal([...html.matchAll(/<form\b/g)].length, 1);
  assert.equal([...html.matchAll(/<details\b/g)].length, 1);
  // Deterministic monogram badges: head agent CA uses surface-accent-violet ring, specialist SA uses graph-line outline.
  assert.match(html, /border-surface-accent-violet-base[^>]*>CA</);
  assert.match(html, /border-border-graph-line-base[^>]*>SA</);
  // Speaker rhythm: two consecutive turns from SA render only one Schema auditor header; visitor turn is the only bubble.
  const log = html.match(/role="log"[\s\S]*?<form/)[0];
  assert.equal([...log.matchAll(/Schema auditor/g)].length, 1);
  assert.equal([...log.matchAll(/Coordinator/g)].length, 1);
  assert.match(log, /justify-end[\s\S]*bg-surface-background-tertiary-base[^>]*><span class="sr-only">You said: <\/span>/);
  // Hairline receipt-ledger rows in polite live regions for handoffs, usage and budget.
  const ledgers = [...log.matchAll(/<dl aria-live="polite"[^>]*>([\s\S]*?)<\/dl>/g)];
  assert.ok(ledgers.length >= 2);
  assert.match(log, /border-border-separator-primary-base/);
  assert.match(log, /Handoff/);
  assert.match(log, /Usage[\s\S]*tabular-nums/);
  assert.match(log, /Budget[\s\S]*tabular-nums/);
  // Solid artifact card: secondary surface, standard radius, filename and mono micro-line (hash + author), no inline preview pane.
  assert.match(log, /bg-surface-background-secondary-base border border-border-separator-primary-base rounded-layout-radius-standard-base[\s\S]*token-audit-report\.md[\s\S]*sha256: [0-9a-f]{7} · author: SA/);
  assert.doesNotMatch(log, /<pre|<code|vi-glass/);
  // All four turn-state status tokens paired with text labels, plus one retry control on failure.
  assert.match(html, /bg-status-indicator-info-base[\s\S]*?running/);
  assert.match(html, /bg-status-indicator-warning-base[\s\S]*?stopping/);
  assert.match(html, /bg-status-indicator-success-base[\s\S]*?finished/);
  assert.match(html, /bg-status-indicator-error-base[\s\S]*?failed[\s\S]*?>Retry<\/button>/);
  // Hover/focus message actions and touch target floors.
  assert.match(log, /group-hover:opacity-100 focus:opacity-100[^>]*>Copy<\/button>/);
  for (const m of html.matchAll(/<(button|textarea)\b[^>]*class="([^"]*)"/g)) {
    assert.match(m[2], /h-action-(min|wide)-default/, m[0].slice(0, 80));
  }
});

test('modular conversation components follow ADR-016 and ADR-017 budgets and aria', () => {
  // 1. speaker-marker.html (ADR-016 item 5)
  const speaker = read('speaker-marker.html');
  const segmentGroup = speaker.match(/<div aria-hidden="true" class="[^"]*">([\s\S]*?)<\/div>/);
  assert.ok(segmentGroup, 'speaker-marker segment container must carry aria-hidden="true"');
  const segments = [...segmentGroup[1].matchAll(/<span class="([^"]*)"><\/span>/g)].map((m) => m[1]);
  assert.equal(segments.length, 5, 'speaker-marker must have five segments');
  assert.deepEqual(
    segments.map((cls) => (cls.match(/bg-persona-accent-([a-z]+)-base/) || [])[1]),
    CANON,
    'speaker-marker segments must follow CANON order',
  );
  const lit = segments.filter((cls) => /\bw-indicator-mark-base\b/.test(cls));
  const dimmed = segments.filter((cls) => /\bw-indicator-dot-base\b/.test(cls) && /\bopacity-40\b/.test(cls));
  assert.equal(lit.length, 1, 'speaker-marker must have exactly one lit segment');
  assert.equal(dimmed.length, 4, 'speaker-marker must have four dimmed segments');
  assert.doesNotMatch(speaker, /text-persona-accent-/);

  // 2. receipt-ledger-row.html (ADR-017 item 6, ADR-020 item 5)
  const receipt = read('receipt-ledger-row.html');
  assert.match(receipt, /<dl aria-live="polite" aria-label="Receipt"/);
  assert.match(receipt, /border-border-separator-primary-base/);
  const terms = [...receipt.matchAll(/<dt class="([^"]*)">/g)];
  const details = [...receipt.matchAll(/<dd class="([^"]*)">/g)];
  assert.ok(terms.length >= 2 && terms.length === details.length, 'receipt ledger must pair <dt> and <dd> rows');
  for (const m of terms) {
    assert.match(m[1], /font-typography-family-mono-base/);
    assert.match(m[1], /tracking-typography-tracking-wide-base/);
  }
  for (const m of details) {
    assert.match(m[1], /font-typography-family-mono-base/);
    assert.match(m[1], /tabular-nums/);
  }
  assert.doesNotMatch(receipt, /vi-glass|persona-accent-/);

  // 3. turn-state-chip.html (ADR-020 item 7)
  const turnStates = read('turn-state-chip.html');
  assert.match(turnStates, /role="status"/);
  assert.match(turnStates, /aria-live="polite"/);
  for (const [token, label] of [
    ['bg-status-indicator-info-base', 'running'],
    ['bg-status-indicator-warning-base', 'stopping'],
    ['bg-status-indicator-success-base', 'finished'],
    ['bg-status-indicator-error-base', 'failed'],
  ]) {
    assert.match(turnStates, new RegExp(`${token}[^>]*><\\/span>${label}<`), `missing ${token} paired with ${label}`);
  }
  assert.doesNotMatch(turnStates, /persona-accent-|animate-pulse/);

  // 4. starter-chips.html (ADR-016 item 8)
  const starters = read('starter-chips.html');
  const starterGroup = starters.match(/<div role="group" aria-label="Starters"[^>]*>([\s\S]*?)<\/div>/);
  assert.ok(starterGroup, 'starter-chips must wrap buttons in role="group" aria-label="Starters"');
  const starterButtons = [...starterGroup[1].matchAll(/<button\b[^>]*class="([^"]*)"[^>]*>/g)];
  assert.equal(starterButtons.length, 4, 'starter-chips fixture must show 4 buttons');
  assert.ok(starterButtons.length >= 1 && starterButtons.length <= 4, 'at most 4 starter buttons');
  for (const m of starterButtons) {
    assert.match(m[1], /\bh-action-min-default\b/);
    assert.match(m[1], /\brounded-layout-radius-full-base\b/);
  }
  assert.doesNotMatch(starters, /bg-surface-accent-violet-base/);
});

test('modular agent-workspace and harness fragments follow ADR-020 contracts and touch targets', () => {
  const workspaceFragments = [
    'owner-approval-gate.html',
    'shared-desktop-catalog.html',
    'artifact-lineage-reader.html',
    'agent-roster-card.html',
    'team-memory-notes.html',
    'cross-team-handoff.html',
    'usage-budget-meter.html',
    'layout-agent-workspace.html',
  ];

  for (const file of workspaceFragments) {
    const html = read(file);
    assert.doesNotMatch(html, /vi-glass/, `${file}: must stay solid (no vi-glass)`);
    assert.doesNotMatch(html, /persona-accent-/, `${file}: must not reuse persona-accent-*`);
    assert.doesNotMatch(html, /bg-surface-accent-violet-base/, `${file}: must not use solid bg-surface-accent-violet-base`);
    for (const m of html.matchAll(/<(button|textarea)\b[^>]*class="([^"]*)"/g)) {
      assert.match(m[2], /h-action-(min|wide)-default/, `${file}: touch target floor on ${m[0].slice(0, 80)}`);
    }
  }

  // 1. owner-approval-gate.html
  const approval = read('owner-approval-gate.html');
  assert.match(approval, /bg-status-indicator-warning-base[\s\S]*waiting_for_owner/);
  assert.match(approval, /<dl\b[\s\S]*sha256:[\s\S]*<\/dl>/);
  assert.match(approval, /border-surface-accent-violet-base[^>]*>Allow once<\/button>/);
  assert.match(approval, />Always allow<\/button>/);
  assert.match(approval, />Reject<\/button>/);
  assert.match(approval, /bg-status-indicator-success-base[\s\S]*Allowed once · sha256:/);

  // 2. shared-desktop-catalog.html
  const desktop = read('shared-desktop-catalog.html');
  assert.match(desktop, /Shared desktop/);
  const checkboxLabels = [...desktop.matchAll(/<label class="([^"]*)">[\s\S]*?<input type="checkbox"[^>]*class="([^"]*)"[\s\S]*?<\/label>/g)];
  assert.ok(checkboxLabels.length >= 3, 'shared-desktop-catalog must have at least 3 checkbox rows');
  for (const m of checkboxLabels) {
    assert.match(m[1], /\bh-action-min-default\b/);
    assert.match(m[2], /\baccent-surface-accent-violet-base\b/);
  }
  assert.match(desktop, />Research</);
  assert.match(desktop, />Guides</);
  assert.match(desktop, /· v2/);
  assert.match(desktop, /· v3/);

  // 3. artifact-lineage-reader.html
  const reader = read('artifact-lineage-reader.html');
  assert.match(reader, /role="dialog"/);
  assert.match(reader, /sha256:/);
  assert.match(reader, />Input files</);
  assert.match(reader, />Other revisions</);
  assert.match(reader, /border-surface-accent-violet-base[^>]*>Download Markdown<\/button>/);

  // 4. agent-roster-card.html
  const roster = read('agent-roster-card.html');
  assert.match(roster, /border-surface-accent-violet-base[^>]*>LA</);
  assert.match(roster, /border-border-graph-line-base[^>]*>SR</);
  assert.match(roster, /border-border-graph-line-base[^>]*>HC</);
  assert.match(roster, />Save as persona<\/button>/);
  assert.match(roster, />Personas<[\s\S]*>Add to team<\/button>[\s\S]*>Edit<\/button>/);

  // 5. team-memory-notes.html
  const notes = read('team-memory-notes.html');
  assert.match(notes, /Always used/);
  assert.match(notes, /Used when relevant/);
  assert.match(notes, />Correct<\/button>/);
  assert.match(notes, />Forget<\/button>/);
  assert.match(notes, />Suggested by agents<[\s\S]*>Keep<\/button>[\s\S]*>Dismiss<\/button>/);
  assert.match(notes, /notes used/);

  // 6. cross-team-handoff.html
  const handoff = read('cross-team-handoff.html');
  assert.match(handoff, /border-surface-accent-violet-base[\s\S]*Question for Release team/);
  assert.match(handoff, /border-surface-accent-violet-base[\s\S]*From team Release team/);
  assert.match(handoff, /bg-status-indicator-success-base[\s\S]*Review approved/);
  assert.match(handoff, /bg-status-indicator-warning-base[\s\S]*Changes requested/);

  // 7. usage-budget-meter.html
  const usage = read('usage-budget-meter.html');
  assert.match(usage, /aria-live="polite"/);
  assert.match(usage, /tabular-nums/);
  assert.match(usage, /measured tokens/);
  assert.match(usage, /tokens unreported/);

  // 8. layout-agent-workspace.html
  const workspace = read('layout-agent-workspace.html');
  assert.match(workspace, /\bw-layout-width-sidebar-base\b/);
  assert.match(workspace, /\bw-layout-width-inspector-base\b/);
  assert.match(workspace, /role="log"/);
  assert.match(workspace, /Shared desktop/);
  assert.match(workspace, /Personas/);
  assert.match(workspace, /Notes/);
  assert.match(workspace, /Usage/);
});

test('Seed contract and public-repo continuity fragments enforce solid surfaces, lexicon, and contracts', () => {
  const continuityFragments = [
    'claim-maturity-badge.html',
    'run-lifecycle-strip.html',
    'tool-registry-row.html',
    'public-repo-card.html',
    'ecosystem-plane-map.html',
  ];
  const internalNames = new RegExp([
    ['Vi', 'Web'].join(''),
    ['Vi', 'App'].join(''),
    ['Vi', 'Bot'].join(''),
    ['Vi', 'Code'].join(''),
    ['Vi', 'Docs'].join(''),
    ['Vi', 'PerScale'].join(''),
    ['ARK', 'SRRA'].join(''),
    ['CT', '100'].join(''),
    '\\bCT\\d+\\b',
  ].join('|'), 'i');
  const loopback = ['127', '0', '0', '1'].join('.');

  for (const file of continuityFragments) {
    const html = read(file);
    assert.doesNotMatch(html, /vi-glass/, `${file}: must stay solid (no vi-glass)`);
    assert.doesNotMatch(html, /persona-accent-/, `${file}: must not use persona-accent-*`);
    assert.doesNotMatch(html, /bg-surface-accent-violet-base/, `${file}: must not use solid bg-surface-accent-violet-base`);
    assert.doesNotMatch(html, internalNames, `${file}: must not contain retired or internal names`);
    assert.equal(html.includes(loopback), false, `${file}: must not contain loopback address`);
    assert.doesNotMatch(html, /\b\d{1,3}(?:\.\d{1,3}){3}\b/, `${file}: must not contain IPv4 addresses`);
    for (const m of html.matchAll(/<(button|textarea|a)\b([^>]*)>/g)) {
      const cls = (m[2].match(/\bclass="([^"]*)"/) || [])[1] || '';
      assert.match(cls, /h-action-(min|wide)-default/, `${file}: touch target floor on ${m[0].slice(0, 80)}`);
    }
  }

  // 1. claim-maturity-badge.html
  const claim = read('claim-maturity-badge.html');
  assert.match(claim, /role="group" aria-label="Claim maturity labels"/);
  for (const [token, label, receipt] of [
    ['bg-status-indicator-success-base', 'implemented', 'npm test'],
    ['bg-status-indicator-info-base', 'observed', '2026-11-22 · rev 8a80204'],
    ['bg-border-graph-line-base', 'specified', 'contract'],
    ['bg-status-indicator-warning-base', 'planned', 'roadmap'],
  ]) {
    assert.match(claim, new RegExp(`${token}[^>]*><\\/span><span>${label}<\\/span>[\\s\\S]*?${receipt}`), `missing ${label} maturity badge`);
  }

  // 2. run-lifecycle-strip.html
  const lifecycle = read('run-lifecycle-strip.html');
  assert.match(lifecycle, /<ol aria-label="Objective and attempt lifecycle"/);
  for (const stage of ['draft', 'ready', 'running', 'waiting_for_owner', 'settling', 'complete']) {
    assert.match(lifecycle, new RegExp(`>${stage}<`), `missing run stage ${stage}`);
  }
  assert.match(lifecycle, /border-surface-accent-violet-base[\s\S]*?>3<[\s\S]*?>running</);
  assert.match(lifecycle, /border-status-indicator-warning-base[\s\S]*?>4<[\s\S]*?>waiting_for_owner<[\s\S]*?>Owner gate</);
  assert.match(lifecycle, /border-status-indicator-success-base[\s\S]*?>6<[\s\S]*?>complete</);
  assert.match(lifecycle, /border-status-indicator-warning-base[\s\S]*stopping → stopped/);
  assert.match(lifecycle, /border-status-indicator-error-base[\s\S]*failed/);
  assert.match(lifecycle, /<dl aria-live="polite" aria-label="Run receipt"/);
  assert.match(lifecycle, /obj-01 · Audit token outputs/);
  assert.match(lifecycle, /vcs\.file\.read · args sha256: 9c1d4e2 · before effect/);

  // 3. tool-registry-row.html
  const registry = read('tool-registry-row.html');
  assert.match(registry, /role="region" aria-label="Neutral tool registry"/);
  assert.match(registry, /Vendor identity lives in the connector binding, never in the tool ID\./);
  for (const [toolId, connector, effect, realm] of [
    ['vcs.file.read', 'local-git', 'read', 'workspace'],
    ['memory.context.read', 'memory-fabric', 'read', 'team-shared'],
    ['ingest.job.create', 'queue-adapter', 'write', 'external'],
    ['compute.rows.check', 'deterministic-checker', 'read', 'artifact-store'],
  ]) {
    assert.match(registry, new RegExp(`${toolId.replace(/\./g, '\\.')}[\\s\\S]*?${connector}[\\s\\S]*?${effect}[\\s\\S]*?${realm}`));
  }
  assert.match(registry, /bg-status-indicator-warning-base[\s\S]*ownerGate · pauses run/);
  assert.match(registry, /bg-status-indicator-info-base[\s\S]*No model call/);

  // 4. public-repo-card.html
  const cards = read('public-repo-card.html');
  assert.equal([...cards.matchAll(/<article\b/g)].length, 4, 'public-repo-card must render 4 article cards');
  for (const repo of ['seed', 'bloom', 'videsign', 'vitools']) {
    assert.match(cards, new RegExp(`>${repo}<`), `missing repo card heading ${repo}`);
  }
  const cardLinks = [...cards.matchAll(/<a\b[^>]*class="([^"]*)"[^>]*>/g)];
  assert.equal(cardLinks.length, 4, 'public-repo-card must render 4 action links');
  for (const m of cardLinks) {
    assert.match(m[1], /\bh-action-min-default\b/);
  }

  // 5. ecosystem-plane-map.html
  const map = read('ecosystem-plane-map.html');
  assert.match(map, /role="region" aria-label="Four-plane public ecosystem"/);
  for (const plane of ['Surfaces', 'Harness', 'Providers', 'Authority stores']) {
    assert.match(map, new RegExp(plane), `missing ecosystem plane ${plane}`);
  }
  for (const noun of ['seed', 'bloom', 'videsign', 'vitools']) {
    assert.match(map, new RegExp(`\\b${noun}\\b`), `missing public proper noun ${noun}`);
  }
  for (const term of ['the native client', 'coding workspace', 'the memory fabric', 'the storage triangle', 'the documentation base', 'coordinator', 'model-backed specialist', 'deterministic checker', 'the local cluster']) {
    assert.match(map, new RegExp(term), `missing generalized lexicon term ${term}`);
  }
});

test('deslopped public-site and design-studio fragments follow ADR-023 contracts', () => {
  const siteFragments = [
    'site-header-island.html',
    'site-footer.html',
    'hero-billboard.html',
    'filterable-catalog-grid.html',
    'client-install-switcher.html',
    'browser-check-runner.html',
    'persona-companion-stage.html',
    'evidence-exhibit-figure.html',
    'design-studio-canvas.html',
    'layout-public-site.html',
  ];
  const internalNames = new RegExp([
    ['Vi', 'Web'].join(''),
    ['Vi', 'App'].join(''),
    ['Vi', 'Bot'].join(''),
    ['Vi', 'Code'].join(''),
    ['Vi', 'Docs'].join(''),
    ['Vi', 'PerScale'].join(''),
    ['ARK', 'SRRA'].join(''),
    '\\bCT\\d+\\b',
  ].join('|'), 'i');

  for (const file of siteFragments) {
    const html = read(file);
    assert.doesNotMatch(html, internalNames, `${file}: must not contain retired internal names`);
    assert.doesNotMatch(html, /\b\d{1,3}(?:\.\d{1,3}){3}\b/, `${file}: must not contain IPv4 literals`);
    assert.doesNotMatch(html, /\/apps\b/, `${file}: must omit unreleased storefront routes`);
    for (const m of html.matchAll(/<(button|textarea|a)\b([^>]*)>/g)) {
      const cls = (m[2].match(/\bclass="([^"]*)"/) || [])[1] || '';
      assert.match(cls, /h-action-(min|wide)-default/, `${file}: touch target floor on ${m[0].slice(0, 80)}`);
    }
    const usesGlass = /vi-glass/.test(html);
    if (file === 'site-header-island.html' || file === 'layout-public-site.html') {
      assert.equal(usesGlass, true, `${file}: expected crystal glass on header island`);
    } else {
      assert.equal(usesGlass, false, `${file}: must stay solid (no vi-glass)`);
    }
  }

  const header = read('site-header-island.html');
  assert.equal([...header.matchAll(/<li\b/g)].length, 6, 'site header holds 6 nav items');
  assert.match(header, />Chat</);
  assert.match(header, /aria-label="Toggle navigation"/);

  const footer = read('site-footer.html');
  for (const repo of ['seed', 'bloom', 'videsign', 'vitools']) assert.match(footer, new RegExp(`>${repo}<`));
  assert.match(footer, /aria-pressed="false"[\s\S]*>Pause background motion</);

  const hero = read('hero-billboard.html');
  assert.match(hero, /text-typography-size-4xl-base lg:text-typography-size-5xl-base/);
  assert.ok(fiveBars(hero).length >= 1, 'hero billboard carries canon five-bar rule');
  for (const plane of ['Surfaces', 'Harness', 'Providers', 'Authority stores']) assert.match(hero, new RegExp(`>${plane}<`));

  const studio = read('design-studio-canvas.html');
  for (const marker of ['Structured brief', 'Reference contract', '>Keep<', '>Change<', '>Do not copy<', '1440px desktop', '1024px tablet', '390px mobile', 'scaffold_page']) {
    assert.ok(studio.includes(marker), `design-studio-canvas missing ${marker}`);
  }
});

test('chibi companion stage, homepage graphic maps, markdown and web UI primitive fragments follow ADR-024 contracts', () => {
  const companion = read('persona-companion-stage.html');
  for (const [vi, ver] of [['violet', 'v005'], ['wisteria', 'v003'], ['xylia', 'v003'], ['yarrow', 'v003'], ['zinnia', 'v003']]) {
    assert.match(companion, new RegExp(`\\{ASSET_BASE\\}/vi/${vi}/chibi/${vi}_chibi_neutral_${ver}\\.png`));
    assert.match(companion, new RegExp(`width="463" height="798"[^>]*alt="${vi[0].toUpperCase() + vi.slice(1)}, neutral"`));
  }
  assert.match(companion, /violet\/chibi\/thinking\/v005/);

  const map = read('systems-constellation-map.html');
  assert.match(map, /role="group" aria-label="Eleven ecosystem nodes and published edges"/);
  assert.match(map, /stroke-border-graph-line-base/);
  assert.match(map, /class="vi-glass-shell"/);

  const md = read('markdown-prose-renderer.html');
  assert.match(md, /<table\b/);
  assert.match(md, /<pre\b/);
  assert.match(md, /<blockquote\b/);

  const diff = read('code-and-diff-viewer.html');
  assert.match(diff, /- removed/);
  assert.match(diff, /\+ added/);

  for (const file of [
    'persona-deliberation-stepper.html',
    'systems-constellation-map.html',
    'markdown-prose-renderer.html',
    'code-and-diff-viewer.html',
    'form-controls.html',
    'button-variants.html',
    'navigation-primitives.html',
    'feedback-and-empty-states.html',
    'disclosure-and-modals.html',
  ]) {
    const html = read(file);
    for (const m of html.matchAll(/<(button|textarea|a)\b([^>]*)>/g)) {
      const cls = (m[2].match(/\bclass="([^"]*)"/) || [])[1] || '';
      assert.match(cls, /h-action-(min|wide)-default/, `${file}: touch target floor on ${m[0].slice(0, 80)}`);
    }
  }
});
