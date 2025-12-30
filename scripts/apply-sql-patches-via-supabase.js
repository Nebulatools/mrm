const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: './apps/web/.env.local' });

function buildSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase config. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }
  return createClient(url, key);
}

function isWhitespace(ch) {
  return ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t';
}

function stripQuotes(identifier) {
  const trimmed = identifier.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseSqlLiteral(raw) {
  const token = raw.trim();
  if (!token) return null;
  if (/^null$/i.test(token)) return null;
  if (token.startsWith("'") && token.endsWith("'")) {
    const inner = token.slice(1, -1);
    return inner.replace(/''/g, "'");
  }

  const numberValue = Number(token);
  if (Number.isFinite(numberValue) && /^-?\d+(\.\d+)?$/.test(token)) return numberValue;

  return token;
}

function splitTopLevelCsv(tupleBody) {
  const parts = [];
  let current = '';
  let inString = false;

  for (let i = 0; i < tupleBody.length; i++) {
    const ch = tupleBody[i];

    if (inString) {
      current += ch;
      if (ch === "'") {
        const next = tupleBody[i + 1];
        if (next === "'") {
          current += next;
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      current += ch;
      continue;
    }

    if (ch === ',') {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.length > 0) parts.push(current.trim());
  return parts;
}

function findStatementEnd(sql, startIdx) {
  let inString = false;
  let parenDepth = 0;

  for (let i = startIdx; i < sql.length; i++) {
    const ch = sql[i];

    if (inString) {
      if (ch === "'") {
        const next = sql[i + 1];
        if (next === "'") {
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      continue;
    }

    if (ch === '(') parenDepth++;
    if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);

    if (ch === ';' && parenDepth === 0) return i;
  }

  return -1;
}

function parseInsertStatement(statement) {
  const lower = statement.toLowerCase();
  const insertIdx = lower.indexOf('insert into');
  if (insertIdx === -1) return null;

  let i = insertIdx + 'insert into'.length;
  while (i < statement.length && isWhitespace(statement[i])) i++;

  const tableStart = i;
  while (i < statement.length && !isWhitespace(statement[i]) && statement[i] !== '(') i++;
  const tableIdent = statement.slice(tableStart, i).trim();
  const [schemaPart, tablePart] = tableIdent.includes('.')
    ? tableIdent.split('.', 2).map(stripQuotes)
    : ['public', stripQuotes(tableIdent)];

  while (i < statement.length && statement[i] !== '(') i++;
  if (statement[i] !== '(') throw new Error(`Unable to find column list for ${tableIdent}`);

  const colStart = i + 1;
  let parenDepth = 1;
  let inString = false;
  i++;

  for (; i < statement.length; i++) {
    const ch = statement[i];

    if (inString) {
      if (ch === "'") {
        const next = statement[i + 1];
        if (next === "'") {
          i++;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      continue;
    }

    if (ch === '(') parenDepth++;
    if (ch === ')') {
      parenDepth--;
      if (parenDepth === 0) break;
    }
  }

  const colsRaw = statement.slice(colStart, i);
  const columns = colsRaw
    .split(',')
    .map((c) => stripQuotes(c).trim())
    .filter(Boolean);

  const valuesIdx = lower.indexOf('values', i);
  if (valuesIdx === -1) throw new Error(`Unable to find VALUES for ${tableIdent}`);

  let j = valuesIdx + 'values'.length;
  while (j < statement.length && isWhitespace(statement[j])) j++;

  const tuples = [];
  let tupleStart = -1;
  parenDepth = 0;
  inString = false;

  for (let k = j; k < statement.length; k++) {
    const ch = statement[k];

    if (inString) {
      if (ch === "'") {
        const next = statement[k + 1];
        if (next === "'") {
          k++;
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (ch === "'") {
      inString = true;
      continue;
    }

    if (ch === '(') {
      if (parenDepth === 0) tupleStart = k;
      parenDepth++;
      continue;
    }

    if (ch === ')') {
      parenDepth--;
      if (parenDepth === 0 && tupleStart !== -1) {
        tuples.push(statement.slice(tupleStart, k + 1));
        tupleStart = -1;
      }
      continue;
    }
  }

  return {
    schema: schemaPart,
    table: tablePart,
    columns,
    tuples,
  };
}

function tuplesToRows(columns, tuples) {
  const rows = [];
  for (const tuple of tuples) {
    const body = tuple.trim().slice(1, -1);
    const parts = splitTopLevelCsv(body);
    if (parts.length !== columns.length) {
      throw new Error(`Tuple column mismatch: expected ${columns.length}, got ${parts.length}`);
    }
    const row = {};
    for (let i = 0; i < columns.length; i++) {
      row[columns[i]] = parseSqlLiteral(parts[i]);
    }
    rows.push(row);
  }
  return rows;
}

async function insertBatched(supabase, table, rows, batchSize) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`Insert failed for ${table} batch starting ${i}: ${error.message}`);
    inserted += batch.length;
  }
  return inserted;
}

async function applySqlFile(supabase, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const insertMatches = [];
  const lower = sql.toLowerCase();

  let idx = 0;
  while (idx < lower.length) {
    const found = lower.indexOf('insert into', idx);
    if (found === -1) break;
    const end = findStatementEnd(sql, found);
    if (end === -1) throw new Error(`Unterminated INSERT starting at ${found} in ${filePath}`);
    insertMatches.push(sql.slice(found, end + 1));
    idx = end + 1;
  }

  if (insertMatches.length === 0) {
    console.log(`No INSERT statements found in ${filePath}`);
    return [];
  }

  const results = [];
  for (const statement of insertMatches) {
    const parsed = parseInsertStatement(statement);
    if (!parsed) continue;
    if ((parsed.schema || 'public') !== 'public') {
      throw new Error(`Only public schema supported (got ${parsed.schema}.${parsed.table})`);
    }
    const rows = tuplesToRows(parsed.columns, parsed.tuples);
    console.log(`➡️  ${filePath}: ${parsed.table} rows ${rows.length}`);
    const inserted = await insertBatched(supabase, parsed.table, rows, 500);
    results.push({ table: parsed.table, inserted });
  }

  return results;
}

async function main() {
  const supabase = buildSupabaseAdmin();
  const files = process.argv.slice(2);
  if (files.length === 0) {
    throw new Error('Usage: node scripts/apply-sql-patches-via-supabase.js <file.sql> [file2.sql ...]');
  }

  for (const file of files) {
    const abs = path.resolve(file);
    await applySqlFile(supabase, abs);
  }
}

main().catch((err) => {
  console.error('❌ Patch apply failed:', err);
  process.exit(1);
});

