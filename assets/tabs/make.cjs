const fs = require('fs');
const path = require('path');

const DIR = process.cwd();
const OUT_FILE = path.join(DIR, '../../tabfiles.js');

function normalizeWhitespace(s){ return s.replace(/\s+/g,' ').trim(); }

function parseFilename(filename){
  const ext = path.extname(filename);
  if(!ext) return null;
  const base = path.basename(filename, ext);
  const sep = ' - ';
  if(!base.includes(sep)) return null;
  const parts = base.split(sep);
  if(parts.length !== 2) return null;
  const band = normalizeWhitespace(parts[0]);
  const song = normalizeWhitespace(parts[1]) + ext;
  if(!band || !song) return null;
  return { band, song };
}

function buildStructure(entries){
  const map = new Map();
  for(const e of entries){
    if(!map.has(e.band)) map.set(e.band, []);
    map.get(e.band).push(e.song);
  }
  return Array.from(map, ([band, tabs]) => ({ band, tabs }));
}

function sortStructure(structure){
  structure.sort((a,b) => a.band.localeCompare(b.band, undefined, {sensitivity:'base'}));
  for(const s of structure){
    s.tabs.sort((x,y) => x.localeCompare(y, undefined, {sensitivity:'base'}));
  }
}

function escapeJsString(s){
  return s.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
}

function toJsContent(structure){
  const bands = structure.map(b => {
    const tabs = b.tabs.map(t => `    "${escapeJsString(t)}"`).join(',\n');
    return `  { band: "${escapeJsString(b.band)}", tabs: [\n${tabs}\n  ] }`;
  }).join(',\n');
  return 'window.g_tabFiles = [\n' + bands + '\n];\n';
}

// Main
const files = fs.readdirSync(DIR);
const parsed = files
  .map(f => {
    const full = path.join(DIR, f);
    try { if(!fs.statSync(full).isFile()) return null; } catch { return null; }
    return parseFilename(f);
  })
  .filter(Boolean);

if(parsed.length === 0){
  console.log('No matching files found.');
  process.exit(0);
}

const structure = buildStructure(parsed);
sortStructure(structure);
fs.writeFileSync(OUT_FILE, toJsContent(structure), 'utf8');
console.log(`Wrote ${OUT_FILE} with ${parsed.length} entries (${structure.length} bands).`);
