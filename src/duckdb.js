import * as duckdb from '@duckdb/duckdb-wasm';

let db = null;
let conn = null;

export async function initDB() {
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  );

  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);

  conn = await db.connect();

  // Register the parquet file
  const response = await fetch('/data/fairness.parquet');
  const buffer = await response.arrayBuffer();
  await db.registerFileBuffer('fairness.parquet', new Uint8Array(buffer));

  // Create a view
  await conn.query(`
    CREATE VIEW fairness AS
    SELECT * FROM read_parquet('fairness.parquet')
  `);

  return conn;
}

export async function query(sql) {
  if (!conn) {
    throw new Error('Database not initialized');
  }
  const result = await conn.query(sql);
  return result.toArray();
}

export async function getDistinctValues(column) {
  const result = await query(`
    SELECT DISTINCT ${column}
    FROM fairness
    WHERE ${column} IS NOT NULL
    ORDER BY ${column}
  `);
  return result.map(row => row[column]);
}

export async function getYearRange() {
  const result = await query(`
    SELECT MIN(year) as min_year, MAX(year) as max_year
    FROM fairness
  `);
  return result[0];
}
