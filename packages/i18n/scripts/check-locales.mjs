#!/usr/bin/env node
/**
 * checkLocales
 *
 * The gate that keeps seven message catalogues honest. It fails the build on:
 *
 *   1. a key present in en-GB and missing anywhere else
 *   2. an orphan key present in a translation but not in en-GB
 *   3. ICU syntax that does not parse
 *   4. an argument that appears in the source message but not the translation,
 *      or the other way round — the commonest way a translated string throws
 *      at runtime instead of at build time
 *   5. a plural block that does not cover every CLDR category the locale uses,
 *      which is how Arabic loses `two`/`few`/`many` and Russian loses `many`
 *   6. an untranslated string masquerading as a translation: any non-source
 *      value identical to en-GB must be declared, either as a deliberate
 *      match ($meta.identicalToSource) or as a known placeholder
 *      ($meta.needsTranslation)
 *   7. a stale declaration — a key listed as needing translation that has
 *      since been translated, or listed as identical when it no longer is
 *
 * Run: pnpm --filter @dahab/i18n check-locales
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { IntlMessageFormat } from 'intl-messageformat';

const here = dirname(fileURLToPath(import.meta.url));
const messagesDir = join(here, '..', 'messages');

const LOCALES = ['en-GB', 'ar-EG', 'ru-RU', 'it-IT', 'fr-FR', 'es-ES', 'de-DE'];
const SOURCE = 'en-GB';

/**
 * CLDR cardinal plural categories each locale actually uses. Kept here rather
 * than derived from Intl.PluralRules so that a change in ICU data shows up as
 * a deliberate edit rather than a silently relaxed check.
 */
const REQUIRED_PLURAL_CATEGORIES = {
  'en-GB': ['one', 'other'],
  'ar-EG': ['zero', 'one', 'two', 'few', 'many', 'other'],
  'ru-RU': ['one', 'few', 'many', 'other'],
  'it-IT': ['one', 'other'],
  'fr-FR': ['one', 'other'],
  'es-ES': ['one', 'other'],
  'de-DE': ['one', 'other'],
};

const problems = [];
const fail = (locale, key, message) => problems.push({ locale, key, message });

function loadCatalogue(locale) {
  const path = join(messagesDir, `${locale}.json`);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(locale, '(file)', `does not parse as JSON: ${error.message}`);
    return null;
  }
  const meta = parsed.$meta ?? {};
  if (meta.locale !== locale) {
    fail(locale, '$meta.locale', `is "${meta.locale}" but the file is ${locale}.json`);
  }
  const { $meta: _ignored, ...messages } = parsed;
  return {
    meta: {
      needsTranslation: new Set(meta.needsTranslation ?? []),
      identicalToSource: new Set(meta.identicalToSource ?? []),
    },
    messages,
  };
}

/** Flatten nested objects to `a.b.c` paths so key sets can be compared. */
function flatten(value, prefix = '', out = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, path, out);
    } else if (typeof child === 'string') {
      out.set(path, child);
    } else {
      out.set(path, child);
    }
  }
  return out;
}

/** Walk an ICU AST, collecting argument names and plural category coverage. */
function inspectAst(nodes, found = { args: new Set(), plurals: [] }) {
  for (const node of nodes) {
    // 0 literal, 1 argument, 2 number, 3 date, 4 time, 5 select, 6 plural,
    // 7 pound, 8 tag — the numeric TYPE enum from @formatjs.
    if (node.type === 1 || node.type === 2 || node.type === 3 || node.type === 4) {
      found.args.add(node.value);
    }
    if (node.type === 5) {
      found.args.add(node.value);
      for (const option of Object.values(node.options ?? {})) {
        inspectAst(option.value, found);
      }
    }
    if (node.type === 6) {
      found.args.add(node.value);
      found.plurals.push(Object.keys(node.options ?? {}));
      for (const option of Object.values(node.options ?? {})) {
        inspectAst(option.value, found);
      }
    }
    if (node.type === 8) {
      inspectAst(node.children ?? [], found);
    }
  }
  return found;
}

function analyse(locale, key, message) {
  if (typeof message !== 'string') {
    fail(locale, key, `is a ${typeof message}; every message must be a string`);
    return null;
  }
  try {
    const formatter = new IntlMessageFormat(message, locale);
    return inspectAst(formatter.ast);
  } catch (error) {
    fail(locale, key, `is not valid ICU: ${error.message.split('\n')[0]}`);
    return null;
  }
}

// ---------------------------------------------------------------------------

const catalogues = new Map();
for (const locale of LOCALES) {
  const catalogue = loadCatalogue(locale);
  if (catalogue !== null) catalogues.set(locale, catalogue);
}

const source = catalogues.get(SOURCE);
if (source === undefined) {
  console.error(`FATAL: the source catalogue ${SOURCE}.json could not be read.`);
  process.exit(1);
}

const sourceKeys = flatten(source.messages);
const sourceAnalysis = new Map();
for (const [key, message] of sourceKeys) {
  const result = analyse(SOURCE, key, message);
  if (result !== null) sourceAnalysis.set(key, result);
}

for (const locale of LOCALES) {
  const catalogue = catalogues.get(locale);
  if (catalogue === undefined) continue;

  const keys = flatten(catalogue.messages);
  const required = REQUIRED_PLURAL_CATEGORIES[locale];

  for (const key of sourceKeys.keys()) {
    if (!keys.has(key)) fail(locale, key, 'is missing (present in en-GB)');
  }
  for (const key of keys.keys()) {
    if (!sourceKeys.has(key)) fail(locale, key, 'is an orphan (not present in en-GB)');
  }

  for (const [key, message] of keys) {
    const analysis = analyse(locale, key, message);
    if (analysis === null) continue;

    // Argument parity against the source message.
    const sourceArgs = sourceAnalysis.get(key)?.args;
    if (sourceArgs !== undefined) {
      for (const arg of sourceArgs) {
        if (!analysis.args.has(arg)) {
          fail(locale, key, `drops the {${arg}} argument that en-GB provides`);
        }
      }
      for (const arg of analysis.args) {
        if (!sourceArgs.has(arg)) {
          fail(locale, key, `introduces an unknown argument {${arg}}`);
        }
      }
    }

    // Plural completeness for this locale's categories.
    for (const categories of analysis.plurals) {
      const declared = new Set(categories.filter((c) => !c.startsWith('=')));
      const missing = required.filter((c) => !declared.has(c));
      if (missing.length > 0) {
        fail(
          locale,
          key,
          `has a plural block missing the ${missing.join(', ')} ` +
            `${missing.length === 1 ? 'category' : 'categories'} — ` +
            `${locale} needs ${required.join(', ')}`,
        );
      }
    }

    // Untranslated-string detection.
    if (locale !== SOURCE) {
      const sourceMessage = sourceKeys.get(key);
      const identical = sourceMessage === message;
      const declaredIdentical = catalogue.meta.identicalToSource.has(key);
      const declaredPlaceholder = catalogue.meta.needsTranslation.has(key);

      if (identical && !declaredIdentical && !declaredPlaceholder) {
        fail(
          locale,
          key,
          'is byte-identical to en-GB but is not declared in $meta.identicalToSource ' +
            'or $meta.needsTranslation — an untranslated string must be visible',
        );
      }
      if (!identical && declaredIdentical) {
        fail(locale, key, 'is declared in $meta.identicalToSource but differs from en-GB');
      }
      if (!identical && declaredPlaceholder) {
        fail(
          locale,
          key,
          'is declared in $meta.needsTranslation but has been translated — remove the entry',
        );
      }
    }
  }

  // Declarations that point at keys which no longer exist.
  for (const declared of [...catalogue.meta.identicalToSource, ...catalogue.meta.needsTranslation]) {
    if (!keys.has(declared)) {
      fail(locale, declared, 'is declared in $meta but no such key exists');
    }
  }
}

// ---------------------------------------------------------------------------

const totalKeys = sourceKeys.size;
if (problems.length === 0) {
  const placeholders = LOCALES.reduce(
    (sum, locale) => sum + (catalogues.get(locale)?.meta.needsTranslation.size ?? 0),
    0,
  );
  console.log(
    `check-locales: OK — ${totalKeys} keys x ${LOCALES.length} locales = ` +
      `${totalKeys * LOCALES.length} messages, ICU valid, plural categories complete` +
      (placeholders > 0 ? `, ${placeholders} marked needs-translation` : ''),
  );
  process.exit(0);
}

const SHOWN = 40;
console.error(`check-locales: ${problems.length} problem(s)\n`);
for (const { locale, key, message } of problems.slice(0, SHOWN)) {
  console.error(`  ${locale}  ${key}  ${message}`);
}
if (problems.length > SHOWN) {
  console.error(`\n  ... and ${problems.length - SHOWN} more.`);
}
process.exit(1);
