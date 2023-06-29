import { execute } from "../util";

/**
 * Executes a drush task.
 * @param root The root path of the site on the system
 * @param command The command to run
 * @param onData If supplied, the task will be created as an ongoing task
 * @returns 
 */
export const exec = (root: string, 
                     command: string,
                     onData?: (data: string) => void) =>
  execute('drush', {
    noCapture: !!onData,
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
  }).task.then((response) => response.split(' ')[3].trim());

/**
 * Fetches the currently installed Drush version
 * @returns The version of the Drush CLI if installed
 * @throws If Drush is not installed
 */
export const getVersion = async (): Promise<string|undefined> => 
  execute<string>('drush', {
    ignoreCode: true,
    args: ['--version'],
  }).task.then((response) => response.split('\n')[0].split(' ')[3].trim())
         .catch(() => undefined);