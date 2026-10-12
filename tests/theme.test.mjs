/**
 * tests/theme.test.mjs
 * ---------------------------------------------------------------------------
 * The light theme is a *token* override, not a set of `dark:` variants. That
 * only works if both palettes stay complete, so the central assertion here is
 * that every colour token declared in `@theme` is re-declared under
 * `[data-theme='light']` — miss one and a component silently keeps its dark
 * value on a white page.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { DEFAULT_THEME, THEME_COOKIE, THEMES } from '../lib/i18n/config.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8');

/** Custom properties declared inside a CSS block. */
function tokensIn(block) {
  return [...block.matchAll(/--([a-z0-9-]+)\s*:/g)].map((match) => match[1]);
}

function block(startingAt, source = css) {
  const start = source.indexOf(startingAt);
  assert.ok(start !== -1, `${startingAt} not found in globals.css`);
  const end = source.indexOf('\n}', start);
  assert.ok(end !== -1, `${startingAt} is not closed`);
  return source.slice(start, end);
}

const baseTokens = tokensIn(block('@theme'));
const lightTokens = tokensIn(block("[data-theme='light'] {"));

test('the dark palette is declared as Tailwind theme tokens', () => {
  assert.ok(baseTokens.length >= 20, `expected a full palette, found ${baseTokens.length}`);
  assert.ok(baseTokens.includes('color-canvas'), 'the canvas token is the base surface');
  assert.ok(baseTokens.includes('color-ink-100'), 'the ink ramp drives all text');
  assert.ok(
    baseTokens.some((token) => token.startsWith('color-iris')) ||
      baseTokens.some((token) => token.startsWith('color-accent')),
    'an accent ramp must exist',
  );
});

test('every colour token is re-declared for the light theme', () => {
  const colours = baseTokens.filter((token) => token.startsWith('color-') || token.startsWith('shadow-'));
  const missing = colours.filter((token) => !lightTokens.includes(token));
  assert.deepEqual(missing, [], `light theme is missing: ${missing.join(', ')}`);

  const strays = lightTokens.filter((token) => !colours.includes(token));
  assert.deepEqual(strays, [], `light theme declares unknown tokens: ${strays.join(', ')}`);
});

test('the light palette is genuinely light and the dark palette genuinely dark', () => {
  const luminance = (hex) => {
    const value = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  };

  const canvas = (source) => source.match(/--color-canvas:\s*(#[0-9a-fA-F]{6})/)[1];
  const lightCanvas = canvas(block("[data-theme='light'] {"));
  const darkCanvas = canvas(block('@theme'));

  assert.ok(luminance(lightCanvas) > 0.85, `light canvas ${lightCanvas} is not light enough`);
  assert.ok(luminance(darkCanvas) < 0.15, `dark canvas ${darkCanvas} is not dark enough`);

  // The ink ramps must invert: dark text on the light canvas, light text on the dark one.
  const lightInk = lightTokens.includes('color-ink-100');
  assert.ok(lightInk, 'light theme must restate the ink ramp');
});

test('no component hard-codes a palette colour', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(?:js|mjs)$/.test(entry)) files.push(full);
    }
  };
  walk(path.join(root, 'app'));
  walk(path.join(root, 'components'));

  const offenders = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    // Hex colours are only allowed where a browser API needs a literal string
    // (meta theme-color, the manifest) — never inside a className.
    for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const value = match[1] ?? match[2] ?? '';
      if (/#[0-9a-fA-F]{3,8}\b/.test(value)) {
        offenders.push(`${path.relative(root, file)}: ${value.slice(0, 60)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `components must use theme tokens, found:\n${offenders.join('\n')}`);
});

/* ------------------------------------------------------------------ cookie */

test('the theme cookie contract is explicit', () => {
  assert.equal(THEME_COOKIE, 'stt_theme');
  assert.deepEqual(THEMES, ['system', 'light', 'dark']);
  assert.equal(DEFAULT_THEME, 'system', 'a first-time visitor should follow the OS');
});

test('the server bakes an explicit preference into the HTML', () => {
  const layout = readFileSync(path.join(root, 'app/layout.js'), 'utf8');
  assert.match(layout, /data-theme-preference=\{theme\}/);
  assert.match(
    layout,
    /data-theme=\{theme === 'system' \? undefined : theme\}/,
    'light/dark must be server-rendered so no-JS visitors get the right palette',
  );
  assert.match(layout, /THEME_SCRIPT/, 'system still needs the pre-paint script');
});

test('the toggle cycles through every theme', () => {
  const toggle = readFileSync(path.join(root, 'components/layout/ThemeToggle.js'), 'utf8');
  for (const theme of THEMES) {
    assert.match(toggle, new RegExp(`'${theme}'`), `the toggle cannot reach "${theme}"`);
  }
  assert.match(toggle, /setTheme\(/, 'the toggle must write through the provider');
});

test('the pre-paint script writes the attributes the CSS reacts to', () => {
  const provider = readFileSync(path.join(root, 'components/providers/ThemeProvider.js'), 'utf8');
  const script = provider.slice(provider.indexOf('export const THEME_SCRIPT'));
  assert.match(script, /setAttribute\('data-theme'/, 'CSS keys off data-theme');
  assert.match(script, /data-theme-preference/);
  assert.match(script, /colorScheme/);
});
