'use strict';

/**
 * sqljs-wrapper.js
 *
 * Wraps sql.js to expose the same synchronous API that better-sqlite3 provides:
 *   db.prepare(sql).get(...params)   → first row as object, or undefined
 *   db.prepare(sql).all(...params)   → array of row objects
 *   db.prepare(sql).run(...params)   → { changes, lastInsertRowid }
 *   db.exec(sql)                     → run multi-statement DDL (no params)
 *   db.pragma(...)                   → no-op (sql.js handles this internally)
 *
 * The database is loaded from / saved to a file on every mutating operation so
 * that data survives process restarts — exactly like better-sqlite3's default
 * behaviour with a file path.
 */

const fs   = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

let SQL  = null;   // sql.js module (loaded once)
let _db  = null;   // sql.js Database instance
let _dbPath = null;

// ─── persistence helpers ────────────────────────────────────────────────────

function _save() {
  if (!_db || !_dbPath) return;
  const data = _db.export();          // Uint8Array
  fs.writeFileSync(_dbPath, Buffer.from(data));
}

function _load() {
  if (!SQL) throw new Error('sql.js not initialised yet');
  if (_dbPath && fs.existsSync(_dbPath)) {
    const buf = fs.readFileSync(_dbPath);
    return new SQL.Database(buf);
  }
  return new SQL.Database();          // fresh in-memory db
}

// ─── row conversion ─────────────────────────────────────────────────────────

/**
 * sql.js returns results as [{columns:[…], values:[[…],…]}, …]
 * Convert to an array of plain objects.
 */
function _rowsToObjects(results) {
  if (!results || results.length === 0) return [];
  const rows = [];
  for (const result of results) {
    const { columns, values } = result;
    for (const row of values) {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      rows.push(obj);
    }
  }
  return rows;
}

// ─── Statement wrapper ───────────────────────────────────────────────────────

class Statement {
  constructor(sql) {
    this._sql = sql;
  }

  /**
   * Bind positional params.
   * better-sqlite3 spreads args: stmt.get(a, b, c)
   * sql.js accepts an array.
   */
  _bind(args) {
    // Flatten a single-array arg: stmt.all(...params) where params is already spread
    return args.map(v => (v === undefined ? null : v));
  }

  get(...args) {
    const rows = _rowsToObjects(_db.exec(this._sql, this._bind(args)));
    return rows[0];   // undefined if empty — matches better-sqlite3
  }

  all(...args) {
    return _rowsToObjects(_db.exec(this._sql, this._bind(args)));
  }

  run(...args) {
    _db.run(this._sql, this._bind(args));
    const changes        = _db.getRowsModified();
    const lastInsertRowid = _rowsToObjects(_db.exec('SELECT last_insert_rowid() as id'))[0]?.id ?? 0;
    _save();
    return { changes, lastInsertRowid };
  }
}

// ─── Database wrapper ────────────────────────────────────────────────────────

class Database {
  prepare(sql) {
    return new Statement(sql);
  }

  exec(sql) {
    _db.run(sql);
    _save();
  }

  // better-sqlite3 pragma calls — sql.js handles WAL/foreign-keys differently;
  // we apply only the ones that make sense, and silently ignore the rest.
  pragma(str) {
    try {
      _db.run(`PRAGMA ${str}`);
    } catch (_) {
      // Some pragmas (e.g. WAL) are silently unsupported in sql.js — ignore.
    }
  }
}

// ─── module export: synchronous initialisation via top-level await workaround ──

/**
 * Because sql.js init is async but the rest of the codebase calls `require()`
 * synchronously, we expose an `initDatabase(filePath)` async function that
 * callers must await once at startup, after which all synchronous calls work.
 */

async function initDatabase(filePath) {
  _dbPath = filePath;

  // Ensure the directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  SQL = await initSqlJs();
  _db = _load();

  return new Database();
}

module.exports = { initDatabase };
