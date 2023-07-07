import { rm } from "fs/promises";
import { execute } from "../util";

/**
 * Get the backup for the specified site and environment
 * @param account The account to log in with
 * @param site The site to pull from
 * @param env The environment to pull from
 * @param type The type of backup to fetch
 * @param targetFile The specific backup to fetch
 * @param saveTo The local dir to save to
 * @returns If a target folder is not specified, the remote URL of the backup. 
 *          Otherwise, the full destination of the download.
 */
export const getBackup = (account: string, 
                          site: string, 
                          env: string, 
                          type: 'code' | 'files' | 'database' | 'db' = 'files',
                          targetFile: string | undefined = undefined,
                          saveTo?: string) => new Promise<string>((res, rej) => {
  execute<string>('terminus', {
    args: ['auth:login', '--email', account],
  }).task.then(() => execute('terminus', {
    args: ['backup:get', 
           `--element=${type}`, 
           saveTo ? `--to=${saveTo}` : '',
           targetFile ? `--file=${targetFile}` : '',
          '--',
          `${site}.${env}`].filter(a => a)
  }).task).then((url) => {
    if (saveTo) {
      res(url.split(' to ')[1].trim());
    } else {
      res(url.trim()); 
    }
  })
  .catch(rej);
});

/**
 * Gets a list of environments for a given site
 * @param account The account to log in with
 * @param site The site to pull from
 * @returns 
 */
export const getEnvironments = (account: string,
                                site: string) => new Promise<string[]>((res, rej) => {
  execute<string>('terminus', {
    args: ['auth:login', '--email', account],
  }).task.then(() => execute('terminus', {
   args: ['env:list', site, '--format', 'list'] 
  }).task.then(list => 
    res(list.split('\n').map((it: string) => it.trim()).filter((it: any) => it)))
  ).catch(rej);
});

/**
 * Flushes caches on the remote pantheon site
 * @param account The account to log in with
 * @param site The site to flush caches on
 * @param site The env to flush caches on
 * @returns 
 */
export const flushCaches = (account: string,
                                site: string,
                                env: string) => new Promise<true>((res, rej) => {
  execute<string>('terminus', {
    args: ['auth:login', '--email', account],
  }).task.then(() => execute('terminus', {
   args: ['drush', `${site}.${env}`, 'cr'] 
  }).task.then(() => res(true))).catch(rej);
});