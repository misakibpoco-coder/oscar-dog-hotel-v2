#!/usr/bin/env node
/**
 * Fails the build if any trace of the legacy V1 backend is found in the
 * built web bundle or the Android assets. Keeps V2 fully separated from the
 * app that existing users are running.
 */
import fs from 'node:fs';
import path from 'node:path';

const LEGACY_MARKERS = [
  'steadtxkidcyqebxtmvf',
  'com.oscardoghotel.app'
];
const TARGETS = ['dist', 'android/app/src/main/assets'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|html|json|css|map|txt)$/.test(e.name)) out.push(p);
  }
  return out;
}

let hits = [];
for (const t of TARGETS) {
  for (const f of walk(t)) {
    const text = fs.readFileSync(f, 'utf8');
    for (const m of LEGACY_MARKERS) if (text.includes(m)) hits.push(`${f}  ->  ${m}`);
  }
}

if (hits.length) {
  console.error('\n[verify-isolation] FAILED: legacy V1 references found:\n  ' + hits.join('\n  '));
  process.exit(1);
}
console.log('[verify-isolation] OK: no legacy V1 references in build output.');
