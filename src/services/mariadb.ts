import { spawnSync, spawn } from "child_process";
import mariadb from "mariadb";
import { execParams } from "../util";

const pool = mariadb.createPool({host: 'localhost', user: 'root', connectionLimit: 5});

export async function getVersion() 
{
  return new Promise((res,rej) => {
    let response = '';

    const proc = spawn('mariadb', ['--version'], execParams)
    proc.stdout.on('data', (data) => {
      response += data.toString();
    });
    proc.on('close', (code) => {
      if (!code) {
        res(response.split(' ')[3].trim());
      } else {
        rej();
      }
    });
  })
}

export function restart(): boolean
{
  const exec = spawnSync('brew', ['services', 'restart', 'mariadb']);
  return exec.status ? false : true;
} 

export async function createDatabase(name: string)
{
  let conn;
  try {
    conn = await pool.getConnection();
    const res = await conn.query(`CREATE DATABASE ${name}`);
    return res;
  } finally {
    conn?.release();
  }
}

export async function dropDatabase(name: string)
{
  let conn;
  try {
    conn = await pool.getConnection();
    const res = await conn.query(`DROP DATABASE ${name}`);
    return res;
  } finally {
    conn?.release();
  }
}

export async function getDatabases() 
{
  let conn;
  try {
    conn = await pool.getConnection();
    const tables = await conn.query("SHOW DATABASES");
    return tables;
  } finally {
    conn?.release();
  }
}

export async function getTables(db: string) 
{
  let conn;
  try {
    conn = await pool.getConnection();
    const tables = await conn.query(`SHOW TABLES FROM ${db}`);
    return tables;
  } catch {
    return [];  
  } finally {
    conn?.release();
  }
}

export async function insertDumpGz(db: string, file: string)
{
  return new Promise((resolve, reject) => {
    const proc = spawn('sh', ['-c', `gzcat ${file} | mariadb -u root -f ${db}`], 
                       { shell: false, stdio: ['ignore', 'inherit', 'inherit'], ...execParams });
    proc.on('exit', (code) => {
      if (code === 0) {
        console.error('import done');
        resolve(undefined);
      } else { 
        console.error('import failed');
        reject();
      }
    })
  })
}