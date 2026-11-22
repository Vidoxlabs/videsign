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

test('accepted status is limited to ratified items and Adopted/Proposed statuses are tracked', () => {
  const lines = SKILL.split('\n');
  let current = '';
  const statuses = [];
  for (const line of lines) {
    const heading = line.match(/^## (ADR-\d+):/);
    if (heading) current = heading[1];
    if (line.startsWith('**Status**:') && current) statuses.push({ id: current, status: line.slice('**Status**:'.length).trim() });
  }
  const adoptedIds = ['ADR-013', 'ADR-016', 'ADR-017', 'ADR-018', 'ADR-019'];
  const proposedIds = ['ADR-006', 'ADR-007', 'ADR-008', 'ADR-009', 'ADR-014', 'ADR-015', 'ADR-020', 'ADR-021', 'ADR-022', 'ADR-023', 'ADR-024'];
  const byId = new Map(statuses.map((adr) => [adr.id, adr.status]));
  for (const id of ['ADR-010', 'ADR-011', 'ADR-012', ...adoptedIds, ...proposedIds]) {
    assert.ok(byId.has(id), `missing **Status**: line for ${id}`);
  }
  for (const adr of statuses) {
    if (adr.id === 'ADR-012') {
      assert.equal(adr.status, 'Accepted 2026-10-27. Used by the web app redesign.');
    } else if (adr.id === 'ADR-011') {
      assert.equal(adr.status, 'Proposed for items 1-6 and 8. Items 7, 9 and 10 are Accepted (7 and 10 on 2026-10-28; 9 on 2026-11-03). Amends ADR-002.');
    } else if (adr.id === 'ADR-010') {
      assert.equal(adr.status, 'Proposed (pending owner confirmation) for items 1 and 3-5. Item 2 is Accepted 2026-11-03 (with ADR-011 item 9).');
    } else {
      assert.equal(adr.status.startsWith('Accepted'), false, adr.id);
      assert.equal(adr.status.includes('are Accepted'), false, adr.id);
      if (adoptedIds.includes(adr.id)) {
        assert.equal(adr.status.startsWith('Adopted (ratification pending; first consumer'), true, adr.id);
      } else {
        assert.equal(proposedIds.includes(adr.id), true, `unexpected ADR status entry: ${adr.id}`);
        assert.equal(adr.status.startsWith('Proposed'), true, adr.id);
      }
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
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-013' && a.status.startsWith('Adopted')));
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

test('the standard carries the persona dialects from lib/dialects.js (ADR-015)', () => {
  const { DIALECTS } = require('../lib/dialects');
  const { standard, 'standard.md': md } = generateStandardArtifacts(TOKENS);
  assert.equal(standard.rules.dialects.strength, 'moderate');
  assert.match(standard.rules.dialects.scope, /^agent surfaces only/);
  for (const [seat, d] of Object.entries(DIALECTS)) {
    assert.deepEqual(standard.rules.dialects.seats[seat].lead, d.lead);
    assert.equal(standard.rules.dialects.seats[seat].motif, d.motif);
  }
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-015' && a.status.startsWith('Proposed')));
  assert.match(md, /## Persona dialects \(ADR-015\)/);
  assert.match(DESIGN, /### Persona dialects \(ADR-015\)/);
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
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-016' && a.status.startsWith('Adopted')));
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
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-017' && a.status.startsWith('Adopted')));
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

test('standard carries the ADR-020 group-conversation rules and they match the tokens', () => {
  const { standard } = generateStandardArtifacts(TOKENS);
  const { groupConversation } = standard.rules;
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-020' && a.status.startsWith('Proposed')));
  assert.equal(groupConversation.adr, 'ADR-020');
  assert.equal(groupConversation.extends, 'ADR-016');
  assert.equal(groupConversation.banPersonaAccentsOnNonPersonaAgents, true);
  assert.equal(groupConversation.identity.outline, TOKENS.colors['border-graph-line-base']);
  assert.equal(groupConversation.identity.fill, TOKENS.colors['surface-background-tertiary-base']);
  assert.equal(groupConversation.identity.headAgentRing, TOKENS.colors['surface-accent-violet-base']);
  assert.equal(groupConversation.identity.minContrast, 3);
  assert.equal(groupConversation.roleLabel.family, TOKENS.typography['typography-family-mono-base']);
  assert.equal(groupConversation.roleLabel.size, TOKENS.typography['typography-size-xs-base']);
  assert.equal(groupConversation.roleLabel.tracking, TOKENS.typography['typography-tracking-wide-base']);
  assert.equal(groupConversation.roleLabel.sentenceCase, true);
  assert.equal(groupConversation.activityAndBudgetRows.separator, TOKENS.colors['border-separator-primary-base']);
  assert.equal(groupConversation.artifactCard.surface, TOKENS.colors['surface-background-secondary-base']);
  assert.equal(groupConversation.artifactCard.radius, TOKENS.spacing['layout-radius-standard-base']);
  assert.equal(groupConversation.artifactCard.noPreviewPanes, true);
  assert.equal(groupConversation.artifactCard.neverGlass, true);
  assert.equal(groupConversation.turnStates.running, TOKENS.colors['status-indicator-info-base']);
  assert.equal(groupConversation.turnStates.stopping, TOKENS.colors['status-indicator-warning-base']);
  assert.equal(groupConversation.turnStates.finished, TOKENS.colors['status-indicator-success-base']);
  assert.equal(groupConversation.turnStates.failed, TOKENS.colors['status-indicator-error-base']);
  assert.equal(groupConversation.turnStates.needsTextLabel, true);
  assert.equal(groupConversation.turnStates.onlyLoop, 'thinking pulse');
  assert.deepEqual(groupConversation.turnStates.banned, ['spinners', 'skeleton bubbles']);
});

test('ADR-020 rules are stated in DESIGN.md prose (parity guard)', () => {
  const prose = DESIGN.toLowerCase();
  for (const phrase of [
    'group conversation surface (adr-020)',
    'persona accent ban',
    'deterministic monogram identity',
    'mono role micro-labels',
    'speaker rhythm',
    'receipt-ledger rows',
    'artifact and file cards',
    'turn-state grammar',
    'message actions',
    '{colors.border-graph-line-base}',
    '{colors.surface-accent-violet-base}',
    '{colors.surface-background-secondary-base}',
    '{colors.status-indicator-info-base}',
    '{colors.status-indicator-warning-base}',
    '{colors.status-indicator-success-base}',
    '{colors.status-indicator-error-base}',
  ]) {
    assert.ok(prose.includes(phrase), `DESIGN.md is missing: ${phrase}`);
  }
  const md = generateStandardArtifacts(TOKENS)['standard.md'];
  assert.ok(md.includes('## Group conversation surface (ADR-020)'), 'standard.md is missing ## Group conversation surface (ADR-020)');
  assert.ok(DESIGN.includes('preview/group-conversation.html'), 'DESIGN.md must reference preview/group-conversation.html');
  assert.ok(fs.existsSync(path.join(ROOT, 'preview/group-conversation.html')), 'preview/group-conversation.html is missing');
});

test('standard carries the ADR-021 modular component catalog and every fragment exists', () => {
  const { COMPONENT_CATALOG } = require('../scripts/generate-standard');
  const { standard } = generateStandardArtifacts(TOKENS);
  const { modularComponents } = standard.rules;
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-021' && a.status.startsWith('Proposed')));
  assert.equal(modularComponents.adr, 'ADR-021');
  assert.deepEqual(modularComponents.extends, ['ADR-016', 'ADR-017', 'ADR-020']);
  assert.equal(modularComponents.mcpTool, 'component_catalog');
  assert.deepEqual(modularComponents.categories, [
    'ui-primitives',
    'markdown-and-code',
    'graphic-maps',
    'persona-canon',
    'conversation',
    'agent-workspace',
    'harness-contracts',
    'public-continuity',
    'design-studio',
  ]);
  assert.deepEqual(modularComponents.claimLabels, ['implemented', 'specified', 'planned', 'observed']);
  assert.deepEqual(modularComponents.publicProperNouns, ['seed', 'bloom', 'videsign', 'vitools']);
  assert.deepEqual(modularComponents.planes, ['surfaces', 'harness', 'providers', 'authority stores']);
  assert.deepEqual(modularComponents.runStates, ['draft', 'ready', 'running', 'waiting_for_owner', 'settling', 'complete', 'stopping', 'stopped', 'failed']);
  assert.deepEqual(modularComponents.toolEffects, ['read', 'write', 'destructive', 'credential']);
  assert.equal(modularComponents.catalog.length, 50);
  assert.deepEqual(modularComponents.catalog, COMPONENT_CATALOG);
  const expectedIds = [
    'conversation-surface', 'chat-dock', 'group-conversation', 'speaker-marker', 'receipt-ledger-row', 'turn-state-chip', 'starter-chips',
    'owner-approval-gate', 'shared-desktop-catalog', 'artifact-lineage-reader', 'agent-roster-card', 'team-memory-notes', 'cross-team-handoff', 'usage-budget-meter', 'layout-agent-workspace',
    'claim-maturity-badge', 'run-lifecycle-strip', 'tool-registry-row', 'browser-check-runner',
    'public-repo-card', 'ecosystem-plane-map', 'site-header-island', 'site-footer', 'hero-billboard', 'filterable-catalog-grid', 'client-install-switcher', 'persona-companion-stage', 'evidence-exhibit-figure',
    'design-studio-canvas', 'layout-public-site',
    'form-controls', 'button-variants', 'navigation-primitives', 'feedback-and-empty-states', 'disclosure-and-modals', 'data-table',
    'markdown-prose-renderer', 'code-and-diff-viewer',
    'systems-constellation-map', 'stage-backdrop', 'memory-field', 'memory-pipeline', 'evidence-lens', 'coverage-grid',
    'persona-deliberation-stepper', 'persona-identity-badge', 'persona-dialects', 'five-bar-rule',
    'instrument', 'statement-proof-row',
  ];
  assert.deepEqual(modularComponents.catalog.map((c) => c.id), expectedIds);
  for (const entry of modularComponents.catalog) {
    assert.equal(entry.file, `preview/${entry.id}.html`);
    assert.ok(fs.existsSync(path.join(ROOT, entry.file)), `missing fragment on disk: ${entry.file}`);
    assert.ok(modularComponents.categories.includes(entry.category), `unexpected category on ${entry.id}`);
    assert.ok(entry.adr && entry.adr.startsWith('ADR-'), `missing ADR on ${entry.id}`);
    assert.ok(Array.isArray(entry.consumers) && entry.consumers.length > 0, `missing consumers on ${entry.id}`);
    assert.ok(typeof entry.summary === 'string' && entry.summary.length > 0, `missing summary on ${entry.id}`);
  }
});

test('ADR-021 rules and fragment references are stated in DESIGN.md prose (parity guard)', () => {
  const prose = DESIGN.toLowerCase();
  for (const phrase of [
    'agent workspace, harness contracts and public-repository components (adr-021)',
    'three-column workstation',
    'owner approval gates and artifact lineage',
    'team roster, governed notes and cross-team handoffs',
    'harness contracts and neutral tool registry',
    'public-repository continuity and claim maturity',
    'pull-first component catalog',
    'component_catalog',
    'rules.modularcomponents',
    'waiting_for_owner',
    'review approved',
    'changes requested',
  ]) {
    assert.ok(prose.includes(phrase), `DESIGN.md is missing: ${phrase}`);
  }
  const adr021Fragments = [
    'preview/owner-approval-gate.html',
    'preview/shared-desktop-catalog.html',
    'preview/artifact-lineage-reader.html',
    'preview/agent-roster-card.html',
    'preview/team-memory-notes.html',
    'preview/cross-team-handoff.html',
    'preview/usage-budget-meter.html',
    'preview/layout-agent-workspace.html',
    'preview/claim-maturity-badge.html',
    'preview/run-lifecycle-strip.html',
    'preview/tool-registry-row.html',
    'preview/public-repo-card.html',
    'preview/ecosystem-plane-map.html',
  ];
  for (const fragment of adr021Fragments) {
    assert.ok(DESIGN.includes(fragment), `DESIGN.md must reference ${fragment}`);
    assert.ok(fs.existsSync(path.join(ROOT, fragment)), `${fragment} is missing`);
  }
  const md = generateStandardArtifacts(TOKENS)['standard.md'];
  assert.ok(
    md.includes('## Modular workspace and public-repo components (ADR-021)'),
    'standard.md is missing ## Modular workspace and public-repo components (ADR-021)',
  );
});

test('standard carries the ADR-022 asset service rules and consolidated files exist', () => {
  const { standard } = generateStandardArtifacts(TOKENS);
  const { assetService } = standard.rules;
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-022' && a.status.startsWith('Proposed')));
  assert.equal(assetService.adr, 'ADR-022');
  assert.equal(assetService.status, 'Proposed');
  assert.deepEqual(assetService.extends, ['ADR-002', 'ADR-010']);
  assert.equal(assetService.allowedAssetHost, 'assets.vidoxlabs.dev');
  assert.equal(assetService.workerEntry, 'pipeline/service/worker.js');
  assert.equal(assetService.serviceLibrary, 'lib/asset-service.js');
  assert.equal(assetService.wranglerConfig, 'pipeline/service/wrangler.toml');
  assert.deepEqual(assetService.visibleStatuses, ['published', 'superseded', 'needs-regen', 'legacy']);
  assert.deepEqual(assetService.hiddenStatuses, ['withdrawn', 'deleted']);
  assert.deepEqual(assetService.noCorsPrefixes, ['/v1/admin', '/v1/review', '/v1/candidates']);
  assert.deepEqual(assetService.throttleLimits, {
    perMinute: 10,
    perHour: 100,
    retentionHours: 2,
    buckets: ['ip (/24 or /64)', 'credential (8-char prefix)'],
  });
  assert.deepEqual(assetService.allowedEventDetailKeys, ['token_id', 'scope', 'asset_id', 'status', 'reason_code']);
  for (const rel of [
    assetService.workerEntry,
    assetService.serviceLibrary,
    assetService.wranglerConfig,
    assetService.migrationsManifest,
    'pipeline/service/README.md',
    ...assetService.migrations.map((name) => `${assetService.migrationsDir}/${name}`),
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing consolidated asset-service file: ${rel}`);
  }
  const prose = DESIGN.toLowerCase();
  assert.ok(prose.includes('consolidated phase 0 asset service (adr-022)'), 'DESIGN.md missing ADR-022 prose');
  assert.ok(prose.includes('auth_fail_windows') || DESIGN.includes('pipeline/service/worker.js'), 'DESIGN.md missing pipeline/service/worker.js');
  const md = generateStandardArtifacts(TOKENS)['standard.md'];
  assert.ok(md.includes('## Persona asset service (ADR-022)'), 'standard.md missing ## Persona asset service (ADR-022)');
});

test('standard carries ADR-023 design studio rules and DESIGN.md prose parity', () => {
  const { standard, 'standard.md': md } = generateStandardArtifacts(TOKENS);
  const { designStudio } = standard.rules;
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-023' && a.status.startsWith('Proposed')));
  assert.equal(designStudio.adr, 'ADR-023');
  assert.equal(designStudio.primitive, 'lib/design-studio.js');
  assert.equal(designStudio.manifestOutput, 'dist/components.manifest.json');
  assert.deepEqual(designStudio.mcpTools, ['design_brief', 'scaffold_page', 'component_catalog']);
  assert.deepEqual(designStudio.referenceContractSections, ['keep', 'change', 'doNotCopy']);
  assert.deepEqual(designStudio.viewports, ['1440px', '1024px', '390px']);
  assert.equal(designStudio.navMaxLinksBeforeStorefront, 6);
  const prose = DESIGN.toLowerCase();
  for (const phrase of [
    'public-site component suite and collaborative design studio (adr-023)',
    'deslopped public-site modules',
    'structured briefs and keep / change / do not copy contracts',
    'mcp scaffolding and manifest',
    'dist/components.manifest.json',
    'scaffold_page',
    'design_brief',
  ]) {
    assert.ok(prose.includes(phrase), `DESIGN.md missing: ${phrase}`);
  }
  assert.ok(md.includes('## Collaborative design studio and site scaffolding (ADR-023)'), 'standard.md missing ## Collaborative design studio and site scaffolding (ADR-023)');
});

test('standard carries ADR-024 base UI, markdown, graphic maps and chibi rules and DESIGN.md prose parity', () => {
  const { standard, 'standard.md': md } = generateStandardArtifacts(TOKENS);
  const { chibiCompanion } = standard.rules;
  assert.ok(standard.adrs.some((a) => a.id === 'ADR-024' && a.status.startsWith('Proposed')));
  assert.equal(chibiCompanion.adr, 'ADR-024');
  assert.deepEqual(chibiCompanion.runtimeCell, { width: 463, height: 798 });
  assert.deepEqual(chibiCompanion.versions, { violet: 'v005', wisteria: 'v003', xylia: 'v003', yarrow: 'v003', zinnia: 'v003' });
  assert.deepEqual(chibiCompanion.slots, ['neutral', 'thinking', 'alert', 'success', 'happy']);
  assert.equal(chibiCompanion.uiPrimitiveFragments.length, 6);
  const prose = DESIGN.toLowerCase();
  for (const phrase of [
    'base ui primitives, markdown rendering, homepage graphic maps and chibi standardization (adr-024)',
    'standardized chibi companions',
    'homepage graphic maps and lenses',
    'markdown and code/diff surfaces',
    'complete ui primitives',
    'preview/systems-constellation-map.html',
    'preview/markdown-prose-renderer.html',
    'preview/form-controls.html',
  ]) {
    assert.ok(prose.includes(phrase), `DESIGN.md missing: ${phrase}`);
  }
  assert.ok(md.includes('## Base UI, markdown, graphic maps and chibi companions (ADR-024)'), 'standard.md missing ## Base UI, markdown, graphic maps and chibi companions (ADR-024)');
});
