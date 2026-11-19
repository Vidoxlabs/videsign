#!/usr/bin/env node

/**
 * safety-hashes.js: builds the value of the SAFETY_SCAN_SHA256_LIST secret.
 *
 * The public-safety scan (scripts/check-public-safety.js) blocks private operator handles, such as
 * a personal username, a machine name or a private hostname, from reaching committed files. It
 * never stores the handles themselves: CI receives only their SHA-256 hashes, and the scan hashes
 * every word it reads and compares. This script turns a list of handles into that hash list.
 *
 * Input: one handle per line on stdin (blank lines and lines starting with # are ignored). A
 * handle is one word of letters, digits, dots, underscores or hyphens, as the scan splits text.
 * Output: the sorted, de-duplicated, comma-separated hashes on stdout, ready to paste into the
 * repository secret. Handles are never printed, never passed as arguments and never written.
 *
 *   npm run -s safety:hashes < handles.txt
 */

const crypto = require('crypto');

function buildHashList(text) {
  const hashes = new Set();
  const problems = [];
  String(text).split(/\r?\n/).forEach((line, index) => {
    const handle = line.trim().toLowerCase();
    if (!handle || handle.startsWith('#')) return;
    if (!/^[a-z0-9._-]{2,}$/.test(handle)) {
      problems.push(`line ${index + 1}: one word of letters, digits, ".", "_" or "-", at least 2 characters (split names into separate lines)`);
      return;
    }
    hashes.add(crypto.createHash('sha256').update(handle).digest('hex'));
  });
  if (problems.length === 0 && hashes.size === 0) problems.push('no handles on stdin');
  return { list: [...hashes].sort().join(','), count: hashes.size, problems };
}

if (require.main === module) {
  const chunks = [];
  process.stdin.on('data', (chunk) => chunks.push(chunk));
  process.stdin.on('end', () => {
    const { list, count, problems } = buildHashList(Buffer.concat(chunks).toString('utf8'));
    if (problems.length > 0) {
      for (const problem of problems) process.stderr.write(`safety:hashes: ${problem}\n`);
      process.exit(1);
    }
    process.stdout.write(`${list}\n`);
    process.stderr.write(`safety:hashes: ${count} handle hash${count === 1 ? '' : 'es'}\n`);
  });
}

module.exports = { buildHashList };
