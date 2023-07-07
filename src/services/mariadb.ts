import mariadb, { Pool } from "mariadb";
import { execute } from "../util";

export type DbPool = Pool;

export const createPool = (host: string = 'localhost', user: string = 'root', password: string = ''): DbPool => 
  mariadb.createPool({ host, user, password });

/**
 * Gets the current version of the MariaDB CLI
 * @returns The version, or undefined if it is not installed.
 */
export const getVersion = (): Promise<string|undefined> => execute<string>('mariadb', {
  args: ['--version']
}).task.then((response) => response.split(/\s+/)[4]).catch(() => undefined);

/**
 * Restarts the MariaDB server
 * @returns A promise that resolves if the restart was successful, or throws if not
 */
export const restart = (): Promise<any> => execute<any>('brew', {
  args: ['services', 'restart', 'mariadb']
}).task;

/**
 * Creates a new database
 * @param name The name of the database to create
 * @returns A promise that resolves if the creation was successful, rejects otherwise
 */
export const createDatabase = (pool: mariadb.Pool, name: string) => new Promise(async (res, rej) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(`CREATE DATABASE ${name}`);
    res(result);
  } catch(reason) {
    rej(reason);
  } finally {
    conn?.release();
  }
});

/**
 * Drops a database
 * @param name The name of the database to drop
 * @returns A promise that resolves if the drop was successful, rejects otherwise
 */
export const dropDatabase = (pool: mariadb.Pool, name: string) => new Promise(async (res, rej) => {
  try {
    const result = await pool.query(`DROP DATABASE ${name}`);
    res(result);
  } catch(reason) {
    rej(reason);
  }
});

/**
 * Gets all databases
 * @returns A promise that resolves to a list of databases, rejects otherwise
 */
export const listDatabases = (pool: mariadb.Pool) => new Promise<string[]>(async (res, rej) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query('SHOW DATABASES');
    res(result.map((it: any) => it['Database']));
  } catch(reason) {
    rej(reason);
  } finally {
    conn?.release();
  }
});

/**
 * Gets all tables in a database
 * @param name The name of the database to list tables from
 * @returns A promise that resolves to a list of tables in a database, rejects otherwise
 */
export const listTables = (pool: mariadb.Pool, db: string) => new Promise(async (res, rej) => {
  let conn;
  const key = `Tables_in_${db}`;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(`SHOW TABLES FROM ${db}`);
    res(result.map((it: any) => it[key]));
  } catch(reason) {
    rej(reason);
  } finally {
    conn?.release();
  }
});

/**
 * Gets all columns in a table
 * @param name The name of the database to list columns from
 * @returns A promise that resolves to a list of columns in a database's table, rejects otherwise
 */
export const listColumns = (pool: mariadb.Pool, 
                            db: string,
                            table: string) => new Promise(async (res, rej) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(`SHOW COLUMNS FROM ${db}.${table}`);
    res(result);
  } catch(reason) {
    rej(reason);
  } finally {
    conn?.release();
  }
});

/**
 * Gets all rows in a table
 * @param name The name of the database to list tables from
 * @returns A promise that resolves to a list of rows in a database's table, rejects otherwise
 */
export const listRows = (pool: mariadb.Pool, 
                         db: string,
                         table: string,
                         limit: number = 10, 
                         offset: number = 0) => new Promise(async (res, rej) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(`SELECT * FROM ${db}.${table} LIMIT ${limit} OFFSET ${offset}`);
    res(result);
  } catch(reason) {
    rej(reason);
  } finally {
    conn?.release();
  }
});

// TODO: Currently requires an empty password root account
/**
 * Attempts to determine the type of dump and inserts it
 * @param db The database to insert into
 * @param file The file to insert 
 * @returns A promise that resolves if the insertion was successful, rejects otherwise
 */
export const insertDump = (db: string, file: string) => {
  const extention = file.split('.').reverse()[0];
  switch (extention) {
    case 'gz': return insertDumpGz(db, file);
    default: return insertDumpGz(db, file);
  }
}

// TODO: Currently requires an empty password root account
/**
 * Inserts a .sql dump into the database.
 * @param db The database to insert into
 * @param file The file to insert
 * @returns A promise that resolves if the insertion was successful, rejects otherwise
 */
export const insertDumpSql = (db: string, file: string) => execute('sh', {
  args: ['-c', `cat ${file} | mariadb -u root -f ${db}`],
  params: {}
})

// TODO: Currently requires an empty password root account
/**
 * Inserts a .gz dump into the database.
 * @param db The database to insert into
 * @param file The file to insert
 * @returns A promise that resolves if the insertion was successful, rejects otherwise
 */
export const insertDumpGz = (db: string, file: string) => execute('sh', {
  args: ['-c', `gzcat ${file} | mariadb -u root -f ${db}`],
  params: {}
})
