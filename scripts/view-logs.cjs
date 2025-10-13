#!/usr/bin/env node
/* CommonJS JSONL log viewer */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) args[key] = true; else { args[key] = next; i++; }
    }
  }
  return args;
}

function parseSince(value) {
  if (!value) return null;
  const num = Number(value);
  if (!Number.isNaN(num) && num > 1e9) return new Date(num);
  if (/^\d+[smhd]$/.test(value)) {
    const n = Number(value.slice(0, -1));
    const unit = value.slice(-1);
    const mult = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return new Date(Date.now() - n * mult);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getFiles(baseDir, category, explicitPath) {
  if (explicitPath) return [path.resolve(explicitPath)];
  const dir = path.join(baseDir, category);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => path.join(dir, f)).sort();
}

function color(s, code) { return `\x1b[${code}m${s}\x1b[0m`; }
const colors = {
  event: s => color(s, '36'), time: s => color(s, '90'), conn: s => color(s, '33'), err: s => color(s, '31')
};

function summarize(event, data) {
  try {
    if (!data) return '';
    if (event === 'input_transcript' || event === 'output_transcript') {
      const t = String(data.text || '');
      return `${t.length > 140 ? t.slice(0, 140) + '…' : t}${data.isFinal ? ' (final)' : ''}`;
    }
    if (event === 'audio_chunk') return `${data.direction || ''} ${data.bytes || 0}B ${data.mimeType || ''}`.trim();
    if (event === 'context_update') return `${data.modality} img:${data.hasImage ? 'yes' : 'no'} chars:${(data.analysis || '').length}`;
    if (event === 'context_injected' || event === 'context_injection_skipped') return `${data.modality || ''} ${data.reason || ''}`.trim();
    if (event === 'model_text') return String(data.text || '').slice(0, 140);
    if (event === 'error') return data?.message || JSON.stringify(data);
    return '';
  } catch { return ''; }
}

async function main() {
  const args = parseArgs(process.argv);
  const baseDir = path.resolve(process.cwd(), 'logs');
  const category = (args.category || 'live').toLowerCase();
  const connection = args.connection || args.conn || null;
  const eventsFilter = (args.event || args.events || '').split(',').map(s => s.trim()).filter(Boolean);
  const since = parseSince(args.since);
  const raw = Boolean(args.raw);
  const fileOverride = args.file || args.path;
  const limit = Number(args.limit || 0);

  const cats = category === 'all' ? ['live', 'webcam', 'transcribe', 'screen'] : [category];
  const files = cats.flatMap(cat => getFiles(baseDir, cat, fileOverride));
  if (files.length === 0) {
    console.error(`No log files found for category(s): ${cats.join(', ')}`);
    process.exit(1);
  }

  let shown = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }) });
    for await (const line of rl) {
      if (!line.trim()) continue;
      let obj; try { obj = JSON.parse(line); } catch { continue; }
      if (since) { const ts = new Date(obj.ts); if (Number.isNaN(ts.getTime()) || ts < since) continue; }
      if (connection && obj.connectionId !== connection) continue;
      if (eventsFilter.length && !eventsFilter.includes(obj.event)) continue;

      if (raw) console.log(JSON.stringify(obj));
      else {
        const t = new Date(obj.ts); const hh = String(t.getHours()).padStart(2,'0'); const mm = String(t.getMinutes()).padStart(2,'0'); const ss = String(t.getSeconds()).padStart(2,'0'); const ms = String(t.getMilliseconds()).padStart(3,'0');
        const head = [colors.time(`${hh}:${mm}:${ss}.${ms}`), colors.event(String(obj.event).padEnd(22,' ')), obj.connectionId ? colors.conn(obj.connectionId) : ''].filter(Boolean).join(' ');
        const tail = summarize(obj.event, obj.data);
        console.log(tail ? `${head}  ${tail}` : head);
      }
      shown++; if (limit > 0 && shown >= limit) return;
    }
  }
}

main().catch((err) => { console.error('Failed to read logs:', err); process.exit(1); });

