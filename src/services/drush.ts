import { spawn } from "child_process";
import { execParams, execute, noop } from "../util";

export interface Controller {
  stop: typeof noop;
}

export interface ExecProc<T> {
  promise: Promise<T>;
  controller: Controller; 
}

export const exec = (root: string, 
                       command: string,
                       onData: (data: string) => void) =>
  execute('drush', {
    ongoing: true,
    args: [...command.split(' '), `--root=${root}`],
    onData
  });

/**
 * Gets the info for a given site
 * @param root The root path of the site on the system
 * @returns The Drush siteinfo in JSON format, or the error if the site was not found.
 */
export const getSiteInfo = async (root: string): Promise<string> => 
  execute<string>('drush', {
    args: ['status', '--format=json', `--root=${root}`],
    process: (response) => {
      return response.split(' ')[3].trim();
    }
  }).task;

/**
 * Fetches the currently installed Drush version
 * @returns The version of the Drush CLI if installed
 * @throws If Drush is not installed
 */
export const getVersion = async (): Promise<string> => 
  execute<string>('drush', {
    ignoreCode: true,
    args: ['--version'],
    process: (response) => response.split('\n')[0].split(' ')[3].trim()
  }).task;