#!/usr/bin/env node
/**
 * pnpm lint:hardcoded
 *
 * Fails the build if a visual value is defined anywhere except
 * packages/tokens/tokens.json, or if a physical direction property is used
 * anywhere at all. Both rules come from CLAUDE.md and neither has an
 * `eslint-disable`-shaped escape hatch, because the point of the rule is that
 * it cannot be waived on a busy afternoon.
 *
 * What it catches:
 *   - hex colours, rgb()/rgba(), hsl()/hsla()
 *   - raw font sizes: `fontSize: 17`, `font-size: 17px`, `text-[17px]`
 *   - raw radii and shadows expressed as literals
 *   - marginLeft / marginRight / paddingLeft / paddingRight and friends
 *   - the physical Tailwind utilities: ml- mr- pl- pr- text-left text-right
 *
 * A file may opt out of a single rule with a comment naming the rule and a
 * reason, e.g. `// lint:hardcoded allow=hex — this is the token source`.
 * The allowance has to say which rule and why, so it shows up in review.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const SEARCH_ROOTS = ['apps', 'packages'];

const SKIP_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.expo',
  '.turbo',
  'coverage',
  'migrations',
  'generated',
  '.git',
]);

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss']);

/**
 * The only place a visual value may be defined, plus the files whose whole
 * job is to talk about the banned patterns.
 */
const EXEMPT_PATHS = [
  join('packages', 'tokens', 'tokens.json'),
  join('packages', 'tokens', 'src', 'generated'),
  join('packages', 'config', 'eslint', 'rtl-plugin.mjs'),
];

/** @typedef {{ id: string, description: string, pattern: RegExp, hint: string }} Rule */

/** @type {Rule[]} */
const RULES = [
  {
    id: 'hex',
    description: 'hex colour literal',
    pattern: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
    hint: 'Define it in packages/tokens/tokens.json and use the token name.',
  },
  {
    id: 'rgb',
    description: 'rgb()/rgba() colour literal',
    pattern: /\brgba?\(\s*\d+[\s,]/g,
    hint: 'Define it in packages/tokens/tokens.json and use the token name.',
  },
  {
    id: 'hsl',
    description: 'hsl()/hsla() colour literal',
    pattern: /\bhsla?\(\s*[\d.]+(?:deg)?[\s,]/g,
    hint: 'Define it in packages/tokens/tokens.json and use the token name.',
  },
  {
    id: 'font-size',
    description: 'raw font size',
    pattern: /\bfontSize\s*:\s*\d|font-size\s*:\s*[\d.]+(?:px|rem|em|pt)|\btext-\[[\d.]+(?:px|rem)\]/g,
    hint: 'Use a type-scale role from @dahab/tokens; sizes are never written inline.',
  },
  {
    id: 'line-height',
    description: 'raw line height',
    pattern: /\blineHeight\s*:\s*\d|line-height\s*:\s*[\d.]+(?:px|rem|em)/g,
    hint: 'Line height travels with its type-scale role in @dahab/tokens.',
  },
  {
    id: 'radius',
    description: 'raw border radius',
    pattern: /\bborderRadius\s*:\s*\d|border-radius\s*:\s*[\d.]+(?:px|rem)/g,
    hint: 'Use a radius token from @dahab/tokens.',
  },
  {
    id: 'shadow',
    description: 'raw box shadow',
    // The lookahead sits directly after the colon and consumes the whitespace
    // itself. Written as `\s*(?!var\()` the `\s*` backtracks to zero width and
    // the negative lookahead passes on the space, so `box-shadow: var(--x)`
    // would be flagged.
    pattern: /box-shadow:(?!\s*(?:var\(|none|inherit|initial|unset))[^;]+;/g,
    hint: 'Shadows come from the token scale only, and are warm-tinted, never neutral grey.',
  },
  {
    id: 'physical-property',
    description: 'physical direction property',
    pattern:
      /\b(?:marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)\b|(?:^|[\s{;])(?:margin-left|margin-right|padding-left|padding-right)\s*:/gm,
    hint: 'Use the logical equivalent: marginStart/marginEnd, paddingStart/paddingEnd, margin-inline-*.',
  },
  {
    id: 'physical-utility',
    description: 'physical Tailwind utility',
    pattern: /(?:^|\s|")(?:ml|mr|pl|pr)-(?:\d|\[|auto|px)|(?:^|\s|")text-(?:left|right)(?=\s|"|$)/gm,
    hint: 'Use ms-/me-/ps-/pe- and text-start/text-end.',
  },
  {
    id: 'physical-text-align',
    description: "textAlign pinned to a physical edge",
    pattern: /textAlign\s*:\s*['"](?:left|right)['"]/g,
    hint: "textAlign is 'auto', never 'left' — it must mirror.",
  },
];

/** `// lint:hardcoded allow=hex — reason` */
const ALLOW_PATTERN = /lint:hardcoded\s+allow=([a-z-]+)/g;

function isExempt(relativePath) {
  return EXEMPT_PATHS.some(
    (exempt) => relativePath === exempt || relativePath.startsWith(exempt + sep),
  );
}

function* walk(directory) {
  let entries;
  try {
    entries = readdirSync(directory);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const full = join(directory, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      yield* walk(full);
    } else if (SOURCE_EXTENSIONS.has(extname(entry))) {
      yield full;
    }
  }
}

/**
 * A linter nobody has seen fail is not a linter. Each rule carries a string
 * it must flag and one it must not, and the whole set is checked before the
 * repo is scanned — so a regex that stops matching is caught on the same run
 * that would otherwise have reported a clean tree.
 */
const SELF_TEST = [
  { rule: 'hex', bad: 'const brand = "#FF6B5A";', good: 'const brand = tokens.color.coral500;' },
  { rule: 'rgb', bad: 'background: rgba(4, 23, 30, 0.6);', good: 'background: var(--surface);' },
  { rule: 'hsl', bad: 'color: hsl(6, 100%, 68%);', good: 'color: var(--ink);' },
  { rule: 'font-size', bad: 'fontSize: 17,', good: 'role: "bodyLarge",' },
  { rule: 'font-size', bad: '<Text className="text-[17px]" />', good: '<Text role="bodyLarge" />' },
  { rule: 'line-height', bad: 'lineHeight: 24,', good: 'role: "bodyLarge",' },
  { rule: 'radius', bad: 'borderRadius: 12,', good: 'radius: "md",' },
  {
    rule: 'shadow',
    bad: 'box-shadow: 0 2px 8px rgba(0,0,0,.2);',
    good: 'box-shadow: var(--shadow-raised);',
  },
  { rule: 'physical-property', bad: 'marginLeft: 8,', good: 'marginStart: 8,' },
  { rule: 'physical-property', bad: '  padding-right: 8px;', good: '  padding-inline-end: 8px;' },
  { rule: 'physical-utility', bad: '<View className="ml-2" />', good: '<View className="ms-2" />' },
  {
    rule: 'physical-utility',
    bad: '<Text className="text-left" />',
    good: '<Text className="text-start" />',
  },
  { rule: 'physical-text-align', bad: "textAlign: 'left',", good: "textAlign: 'auto'," },
];

function ruleById(id) {
  const rule = RULES.find((candidate) => candidate.id === id);
  if (rule === undefined) throw new Error(`Self-test names an unknown rule: ${id}`);
  return rule;
}

function matches(rule, source) {
  rule.pattern.lastIndex = 0;
  return rule.pattern.test(source);
}

const selfTestFailures = [];
for (const testCase of SELF_TEST) {
  const rule = ruleById(testCase.rule);
  if (!matches(rule, testCase.bad)) {
    selfTestFailures.push(`${rule.id} failed to flag: ${testCase.bad}`);
  }
  if (matches(rule, testCase.good)) {
    selfTestFailures.push(`${rule.id} wrongly flagged: ${testCase.good}`);
  }
}
for (const rule of RULES) {
  if (!SELF_TEST.some((testCase) => testCase.rule === rule.id)) {
    selfTestFailures.push(`${rule.id} has no self-test case`);
  }
}
if (selfTestFailures.length > 0) {
  console.error('lint:hardcoded self-test failed — the rules themselves are broken:\n');
  for (const failure of selfTestFailures) console.error(`  ${failure}`);
  process.exit(2);
}

const violations = [];
let filesScanned = 0;

for (const root of SEARCH_ROOTS) {
  for (const file of walk(join(repoRoot, root))) {
    const relativePath = relative(repoRoot, file);
    if (isExempt(relativePath)) continue;

    const source = readFileSync(file, 'utf8');
    filesScanned += 1;

    const allowed = new Set();
    ALLOW_PATTERN.lastIndex = 0;
    let allowMatch;
    while ((allowMatch = ALLOW_PATTERN.exec(source)) !== null) {
      if (allowMatch[1] !== undefined) allowed.add(allowMatch[1]);
    }

    const lines = source.split('\n');

    for (const rule of RULES) {
      if (allowed.has(rule.id)) continue;
      rule.pattern.lastIndex = 0;
      let match;
      while ((match = rule.pattern.exec(source)) !== null) {
        const lineNumber = source.slice(0, match.index).split('\n').length;
        const line = (lines[lineNumber - 1] ?? '').trim();
        violations.push({
          file: relativePath,
          line: lineNumber,
          rule: rule.id,
          description: rule.description,
          hint: rule.hint,
          snippet: line.length > 100 ? `${line.slice(0, 97)}…` : line,
        });
      }
    }
  }
}

if (violations.length === 0) {
  console.log(
    `lint:hardcoded: OK — ${filesScanned} files scanned, ${RULES.length} rules, no violations.`,
  );
  process.exit(0);
}

console.error(`lint:hardcoded: ${violations.length} violation(s)\n`);

const byRule = new Map();
for (const violation of violations) {
  const list = byRule.get(violation.rule) ?? [];
  list.push(violation);
  byRule.set(violation.rule, list);
}

for (const [ruleId, list] of byRule) {
  const first = list[0];
  console.error(`  ${ruleId} — ${first?.description ?? ''} (${list.length})`);
  console.error(`    ${first?.hint ?? ''}`);
  for (const violation of list.slice(0, 10)) {
    console.error(`      ${violation.file}:${violation.line}  ${violation.snippet}`);
  }
  if (list.length > 10) console.error(`      … and ${list.length - 10} more`);
  console.error('');
}

process.exit(1);
