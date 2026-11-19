/**
 * Agent standard contract: dist/standard.json and dist/standard.md are
 * deterministic digests of DESIGN.md + SKILL.md (addendum §2).
 */

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  parseFrontMatter,
} = require('../scripts/generate-tokens');
const {
  generateStandardArtifacts,
  parseAdrIndex,
} = require('../scripts/generate-standard');

const ROOT = path.join(__dirname, '..');
const DESIGN = fs.readFileSync(path.join(ROOT, 'DESIGN.md'), 'utf-8');
const SKILL = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf-8');
const TOKENS = parseFrontMatter(DESIGN);

before(() => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], {
    cwd: ROOT,
    stdio: 'ignore',
  });
});

test('ADR index includes crystal glass through spacing rhythm', () => {
  const ids = parseAdrIndex(SKILL).map((a) => a.id);
  for (const id of ['ADR-006', 'ADR-007', 'ADR-008', 'ADR-009']) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
});

test('standard.json carries tokens, rules and ADR index', () => {
  const { standard } = generateStandardArtifacts(TOKENS);
  assert.equal(standard.meta.designSystem, 'Nocturne Museum');
  assert.equal(standard.rules.glass.material, 'crystal');
  assert.equal(standard.rules.typography.sentenceCase, true);
  assert.equal(standard.rules.typography.banUppercaseUtility, true);
  assert.equal(standard.rules.spacing.rhythmBasePx, 4);
  assert.ok(standard.tokens.typography['typography-weight-medium-base']);
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-009'));
});

test('npm run tokens writes deterministic standard artifacts', () => {
  const a = {
    json: fs.readFileSync(path.join(ROOT, 'dist', 'standard.json'), 'utf-8'),
    md: fs.readFileSync(path.join(ROOT, 'dist', 'standard.md'), 'utf-8'),
  };
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'generate-tokens.js')], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  const b = {
    json: fs.readFileSync(path.join(ROOT, 'dist', 'standard.json'), 'utf-8'),
    md: fs.readFileSync(path.join(ROOT, 'dist', 'standard.md'), 'utf-8'),
  };
  assert.equal(a.json, b.json);
  assert.equal(a.md, b.md);
  assert.match(a.md, /Spacing rhythm \(ADR-009\)/);
  assert.match(a.json, /"banLegacyUtilities"/);
});

test('MCP resource list includes the generated standard when present', () => {
  // Light structural check: mcp-server registers STANDARD_RESOURCES paths.
  const src = fs.readFileSync(path.join(ROOT, 'mcp-server.js'), 'utf-8');
  assert.match(src, /dist\/standard\.json/);
  assert.match(src, /dist\/standard\.md/);
});

test('standard rules appear in DESIGN.md or SKILL.md (parity guard)', () => {
  const { standard } = generateStandardArtifacts(TOKENS);
  const corpus = `${DESIGN}\n${SKILL}`.toLowerCase();
  for (const entry of standard.rules.glass.scope) {
    assert.ok(corpus.includes(entry.toLowerCase()), `glass scope missing from prose: ${entry}`);
  }
  assert.ok(corpus.includes('three') || corpus.includes('3'), 'layer limit prose');
  assert.match(corpus, /prefers-reduced-transparency/);
  assert.match(corpus, /prefers-contrast/);
  assert.match(corpus, /forced-colors/);
  assert.match(corpus, /backdrop-filter/);
  for (const word of standard.rules.copy.noOverclaim) {
    assert.ok(corpus.includes(word.toLowerCase()), `overclaim word missing from prose: ${word}`);
  }
});

test('ADR-012 status stays neutral in shipped and generated files', () => {
  const phrases = [['owner', '-approved'].join(''), ['owner', ' approved'].join('')];
  const repoName = ['Vi', 'Web'].join('');
  const listed = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT }).toString().split('\0').filter(Boolean);
  const generated = generateStandardArtifacts(TOKENS);
  const adr012 = generated.standard.adrs.find((adr) => adr.id === 'ADR-012');
  assert.equal(adr012.status, 'Accepted 2026-10-27. Used by the web app redesign.');
  const files = new Map(listed.map((rel) => [rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')]));
  files.set('dist/standard.json', generated['standard.json']);
  files.set('dist/standard.md', generated['standard.md']);
  const hits = [];
  for (const [rel, text] of files) {
    const lower = text.toLowerCase();
    for (const phrase of phrases) {
      if (lower.includes(phrase)) hits.push(`${rel}: ${phrase}`);
    }
    const adrText = rel === 'SKILL.md' || rel.startsWith('dist/standard.') || lower.includes('adr-012');
    if (adrText && lower.includes(repoName.toLowerCase())) hits.push(`${rel}: ${repoName}`);
  }
  assert.deepEqual(hits, []);
});

test('accepted status is limited to items 7 and 10 and the light theme', () => {
  const lines = SKILL.split('\n');
  let current = '';
  const statuses = [];
  for (const line of lines) {
    const heading = line.match(/^## (ADR-\d+):/);
    if (heading) current = heading[1];
    if (line.startsWith('**Status**:') && current) statuses.push({ id: current, status: line.slice('**Status**:'.length).trim() });
  }
  for (const adr of statuses) {
    if (adr.id === 'ADR-012') {
      assert.equal(adr.status, 'Accepted 2026-10-27. Used by the web app redesign.');
    } else if (adr.id === 'ADR-011') {
      assert.equal(adr.status, 'Proposed for items 1-6 and 8. Items 7, 9 and 10 are Accepted (7 and 10 on 2026-10-28; 9 on 2026-11-03). Amends ADR-002.');
    } else {
      assert.equal(adr.status.startsWith('Accepted'), false, adr.id);
      assert.equal(adr.status.includes('are Accepted'), false, adr.id);
    }
  }
  assert.equal(/items 1-6, 8 and 9 are Accepted/i.test(SKILL), false);
  assert.equal(SKILL.includes('Items 1-10 are Accepted'), false);
  const adr004 = SKILL.slice(SKILL.indexOf('## ADR-004:'), SKILL.indexOf('## ADR-005:'));
  const item4 = adr004.split('\n').find((line) => line.startsWith('4. '));
  assert.match(item4, /The persona token `\{colors\.persona-accent-violet-base\}` and the CTA and focus token/);
  assert.equal(/waiv|decid|settl/i.test(item4), false);
});

test('standard digests DESIGN.md and SKILL.md by SHA-256 and reads version from package.json', () => {
  const { standard } = generateStandardArtifacts(TOKENS);
  const crypto = require('crypto');
  const sha = (t) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
  assert.equal(standard.designBodySha256, sha(DESIGN));
  assert.equal(standard.skillBodySha256, sha(SKILL));
  assert.equal(standard.meta.version, JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')).version);
  assert.equal(standard.designBodyHashSeed, undefined);
  assert.equal(standard.skillBodyHashSeed, undefined);
});

test('standard carries the ADR-013 rules and they match the tokens', () => {
  const { standard } = generateStandardArtifacts(TOKENS);
  const { rules } = standard;
  const canon = ['violet', 'wisteria', 'xylia', 'yarrow', 'zinnia'];
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-013' && a.status.startsWith('Proposed')));
  assert.ok(rules.glass.scope.includes('chat dock'));
  assert.equal(rules.motion.ambient.drift, TOKENS.transition['transition-duration-ambient-drift-base']);
  assert.equal(rules.motion.ambient.pulse, TOKENS.transition['transition-duration-ambient-pulse-base']);
  assert.deepEqual(rules.stage.lights, canon);
  assert.equal(rules.stage.crown, canon[2]);
  assert.equal(rules.stage.dotGridRetired, true);
  assert.deepEqual(rules.fiveBar.order, canon);
  assert.equal(rules.fiveBar.height, TOKENS.size['indicator-fivebar-base']);
  assert.equal(rules.graphLine.dark, TOKENS.colors['border-graph-line-base']);
  assert.equal(rules.graphLine.light, TOKENS.colors['border-graph-line-light']);
  assert.equal(rules.graphLine.minContrast, rules.accessibility.contrastFloorNonText);
  assert.deepEqual(rules.chatDock.log, { role: 'log', ariaLive: 'polite', ariaRelevant: 'additions', labelled: true });
  assert.equal(rules.chatDock.dialog.ariaModal, false);
  assert.deepEqual(rules.chatDock.personaSwitcher.seats, canon);
  assert.equal(rules.accessibility.xyliaNeverText, true);
  assert.equal(rules.accessibility.xyliaNeverAlone, true);
});

test('ADR-013 rules in the standard are stated in DESIGN.md prose (parity guard)', () => {
  const prose = DESIGN.toLowerCase();
  for (const phrase of [
    'five-bar rule (adr-013)',
    'chat dock (adr-013)',
    'non-text contrast (wcag 1.4.11, adr-013)',
    'motion that loops (wcag 2.2.2, adr-013)',
    'role="log"',
    'aria-live="polite"',
    'aria-modal="false"',
    'shift+enter',
    'escape closes',
    'the dot grid is retired',
    '{size.indicator-fivebar-base}',
    '{colors.border-graph-line-base}',
    '{colors.border-graph-line-light}',
    '{transition.transition-duration-ambient-drift-base}',
    '{transition.transition-duration-ambient-pulse-base}',
  ]) {
    assert.ok(prose.includes(phrase), `DESIGN.md is missing: ${phrase}`);
  }
  const md = generateStandardArtifacts(TOKENS)['standard.md'];
  assert.ok(prose.includes('lib/stage.js'), 'DESIGN.md must point at the stage primitive');
  for (const heading of ['## Stage backdrop (ADR-013)', '## Five-bar rule (ADR-013)', '## Graph line (ADR-013)', '## Chat dock (ADR-013)', '## Accessibility']) {
    assert.ok(md.includes(heading), `standard.md is missing ${heading}`);
  }
});

test('the standard carries the stage primitive values from lib/stage.js', () => {
  const stage = require('../lib/stage');
  const { rules } = generateStandardArtifacts(TOKENS).standard;
  assert.equal(rules.stage.primitive, 'lib/stage.js');
  assert.equal(rules.stage.ambientOpacity, stage.STAGE_VARIANT_OPACITY.ambient);
  assert.equal(rules.stage.narrowAmbientOpacity, stage.STAGE_NARROW_AMBIENT_OPACITY);
  assert.equal(rules.stage.heroTextScrim, stage.STAGE_TEXT_SCRIM);
});

test('standard carries the ADR-016 conversation rules and they match the tokens', () => {
  const { standard } = generateStandardArtifacts(TOKENS);
  const { conversation, chatDock } = standard.rules;
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-016' && a.status.startsWith('Proposed')));
  assert.equal(conversation.adr, 'ADR-016');
  assert.equal(conversation.atRest.length, 4);
  assert.equal(conversation.header.rows, 1);
  assert.equal(conversation.header.overflowMenus, 1);
  assert.deepEqual(conversation.seatDots.seats, chatDock.personaSwitcher.seats);
  assert.equal(conversation.seatDots.pressedState, chatDock.personaSwitcher.pressedState);
  assert.equal(conversation.seatDots.minTarget, TOKENS.size['action-min-default']);
  assert.deepEqual(conversation.header.secondLine, ['seat dots']);
  assert.equal(conversation.seatDots.printsNames, false);
  assert.equal(conversation.starters.max, 4);
  assert.equal(conversation.followUps.max, 3);
  assert.equal(conversation.composer.fields, 1);
  assert.equal(conversation.composer.keys, chatDock.composer);
  assert.equal(conversation.disclosure.linesAtRest, 1);
  assert.equal(conversation.motion.open, TOKENS.transition['transition-duration-slow-base']);
  assert.equal(conversation.motion.openEasing, TOKENS.transition['transition-easing-spring-base']);
  assert.equal(conversation.motion.turnEnter, TOKENS.transition['transition-duration-normal-base']);
  assert.equal(TOKENS.size['layout-width-conversation-base'], '27.5rem');
});

test('standard carries the ADR-017 instrument rules and they match the tokens', () => {
  const { standard } = generateStandardArtifacts(TOKENS);
  const { instrument, graphLine, accessibility } = standard.rules;
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-017' && a.status.startsWith('Proposed')));
  assert.equal(instrument.everyControlHasConsequence, true);
  assert.equal(instrument.controls.minTarget, accessibility.minTouchTarget);
  assert.equal(instrument.diagram.line, graphLine.dark);
  assert.equal(instrument.diagram.blocked, TOKENS.colors['status-indicator-error-base']);
  assert.equal(instrument.diagram.blockedNeedsTextLabel, true);
  assert.equal(instrument.receipt.ariaLive, 'polite');
});

test('ADR-016 and ADR-017 rules are stated in DESIGN.md prose (parity guard)', () => {
  const prose = DESIGN.toLowerCase();
  for (const phrase of [
    'conversation surface (adr-016)',
    'explorable instrument (adr-017)',
    'one header row, the conversation, one composer field and one disclosure line',
    'five dots in canon order',
    'the switcher prints no names',
    'text on the core, no card',
    'only when the speaker changes',
    'at most four starters',
    'at most three follow-up chips',
    'one line at rest',
    "the full statement stands until the visitor's first turn",
    'the thinking pulse is the only loop',
    'every control has a consequence',
    'switch row',
    'no bordered fieldset and no default checkbox',
    'receipt as ledger',
    '{size.layout-width-conversation-base}',
    'a second line holds the seat dots',
    '{colors.status-indicator-error-base}',
  ]) {
    assert.ok(prose.includes(phrase), `DESIGN.md is missing: ${phrase}`);
  }
  const md = generateStandardArtifacts(TOKENS)['standard.md'];
  for (const heading of ['## Conversation surface (ADR-016)', '## Explorable instrument (ADR-017)']) {
    assert.ok(md.includes(heading), `standard.md is missing ${heading}`);
  }
  for (const fragment of ['preview/conversation-surface.html', 'preview/chat-dock.html', 'preview/instrument.html']) {
    assert.ok(DESIGN.includes(fragment), `DESIGN.md must reference ${fragment}`);
    assert.ok(fs.existsSync(path.join(ROOT, fragment)), `${fragment} is missing`);
  }
});
