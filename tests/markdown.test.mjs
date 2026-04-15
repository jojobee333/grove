#!/usr/bin/env node
/**
 * Grove Markdown Tests
 * Tests simpleMarkdown() — headings, bold/italic, inline code, code blocks,
 * links, lists, GFM tables, paragraphs, CRLF normalisation.
 *
 * Run:  node tests/markdown.test.mjs
 */

import { test } from 'node:test';
import assert   from 'node:assert/strict';

import { simpleMarkdown } from '../app/modules/markdown.js';

// ── Headings ─────────────────────────────────────────────────────────────────

test('h1 becomes h2 (Grove style)', () => {
  assert.equal(simpleMarkdown('# Hello'), '<h2>Hello</h2>');
});

test('h2 becomes h2', () => {
  assert.equal(simpleMarkdown('## Hello'), '<h2>Hello</h2>');
});

test('h3 becomes h3', () => {
  assert.equal(simpleMarkdown('### Hello'), '<h3>Hello</h3>');
});

test('h4 becomes h4', () => {
  assert.equal(simpleMarkdown('#### Hello'), '<h4>Hello</h4>');
});

// ── Inline formatting ─────────────────────────────────────────────────────────

test('bold with **', () => {
  const out = simpleMarkdown('**bold text**');
  assert.ok(out.includes('<strong>bold text</strong>'));
});

test('italic with *', () => {
  const out = simpleMarkdown('*italic text*');
  assert.ok(out.includes('<em>italic text</em>'));
});

test('inline code with backtick', () => {
  const out = simpleMarkdown('Use `npm install` to install');
  assert.ok(out.includes('<code>npm install</code>'));
});

// ── Links ─────────────────────────────────────────────────────────────────────

test('external link gets target=_blank', () => {
  const out = simpleMarkdown('[Click](https://example.com)');
  assert.ok(out.includes('target="_blank"'));
  assert.ok(out.includes('rel="noopener noreferrer"'));
  assert.ok(out.includes('href="https://example.com"'));
});

test('internal link has no target=_blank', () => {
  const out = simpleMarkdown('[Page](./page.html)');
  assert.ok(!out.includes('target="_blank"'));
  assert.ok(out.includes('href="./page.html"'));
});

// ── Lists ─────────────────────────────────────────────────────────────────────

test('unordered list items become <ul><li>', () => {
  const out = simpleMarkdown('- Item one\n- Item two\n- Item three');
  assert.ok(out.includes('<ul>'));
  assert.ok(out.includes('<li>Item one</li>'));
  assert.ok(out.includes('<li>Item two</li>'));
  assert.ok(out.includes('<li>Item three</li>'));
  assert.ok(out.includes('</ul>'));
});

// ── Code blocks ───────────────────────────────────────────────────────────────

test('fenced code block is wrapped in <pre><code>', () => {
  const out = simpleMarkdown('```\nconst x = 1;\n```');
  assert.ok(out.includes('<pre><code>'));
  assert.ok(out.includes('const x = 1;'));
});

test('fenced code block HTML-escapes < and >', () => {
  const out = simpleMarkdown('```\nif (a < b && c > d) {}\n```');
  assert.ok(out.includes('&lt;'));
  assert.ok(out.includes('&gt;'));
  assert.ok(!out.includes('<b'));
});

test('fenced code block is not transformed by inline rules', () => {
  // Bold markers inside code block must not become <strong>
  const out = simpleMarkdown('```\n**not bold**\n```');
  assert.ok(!out.includes('<strong>'));
  assert.ok(out.includes('**not bold**'));
});

test('language hint after fence is accepted', () => {
  const out = simpleMarkdown('```js\nconsole.log("hi");\n```');
  assert.ok(out.includes('<pre><code>'));
  assert.ok(out.includes('console.log'));
});

// ── GFM Tables ────────────────────────────────────────────────────────────────

test('GFM table renders <table> with thead and tbody', () => {
  const md = '| Name | Score |\n|------|-------|\n| Alice | 90 |\n| Bob | 85 |\n';
  const out = simpleMarkdown(md);
  assert.ok(out.includes('<table class="md-table">'));
  assert.ok(out.includes('<thead>'));
  assert.ok(out.includes('<th>Name</th>'));
  assert.ok(out.includes('<th>Score</th>'));
  assert.ok(out.includes('<tbody>'));
  assert.ok(out.includes('<td>Alice</td>'));
  assert.ok(out.includes('<td>90</td>'));
});

test('table pipe characters are not corrupted by inline transforms', () => {
  // Pipes between cells should not be treated as bold markers etc.
  const md = '| A | B |\n|---|---|\n| 1 | 2 |\n';
  const out = simpleMarkdown(md);
  assert.ok(!out.includes('<em>'));
  assert.ok(out.includes('<table'));
});

// ── Paragraphs ────────────────────────────────────────────────────────────────

test('plain text becomes a paragraph', () => {
  const out = simpleMarkdown('Just a sentence.');
  assert.ok(out.includes('<p>Just a sentence.</p>'));
});

// ── CRLF normalisation ────────────────────────────────────────────────────────

test('CRLF line endings are normalised before processing', () => {
  const md = '# Title\r\n\r\nSome text.';
  const out = simpleMarkdown(md);
  assert.ok(out.includes('<h2>Title</h2>'));
  assert.ok(out.includes('<p>Some text.</p>'));
});

test('GFM table with CRLF is rendered correctly', () => {
  const md = '| A | B |\r\n|---|---|\r\n| 1 | 2 |\r\n';
  const out = simpleMarkdown(md);
  assert.ok(out.includes('<table'));
  assert.ok(out.includes('<td>1</td>'));
});

// ── Mixed content ─────────────────────────────────────────────────────────────

test('bold inside a heading', () => {
  const out = simpleMarkdown('## **Important** heading');
  assert.ok(out.includes('<strong>Important</strong>'));
  assert.ok(out.includes('<h2>'));
});

test('code block followed by normal paragraph', () => {
  const md = '```\nconsole.log("hi");\n```\n\nSome prose below.';
  const out = simpleMarkdown(md);
  assert.ok(out.includes('<pre><code>'));
  assert.ok(out.includes('<p>Some prose below.</p>'));
});
