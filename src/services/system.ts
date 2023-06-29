import { existsSync } from "fs";
import { execute } from "../util";
import { drush, php } from "..";

type HOMEBREW_ERRORS = 'NOT_INSTALLED';
type DRUPAL_ERRORS = 'NO_DRUSH' | 'NO_PHP';
type DRUPAL_WARN = 'NO_DEFAULT_PHP' | 'PHP_NEEDS_CONFIG_UPDATE';

/**
 * 
 * @returns A promise that resolves to a status report if your system is configured to 
 *          run Drupal projects.
 */
export const checkDrupal = () => new Promise(async (res,rej) => {
  const errors: DRUPAL_ERRORS[] = [];
  const warn: DRUPAL_WARN[] = [];

  // Check if Drush is installed
  if (!(await drush.getVersion())) {
    errors.push('NO_DRUSH')
  }

  // Check for PHP
  const phpVers = (await php.getVersions(true));

  if (!phpVers) {
    errors.push('NO_PHP');
  } else {
    if (!phpVers.find((it) => it.name === 'default')) {
      warn.push('NO_DEFAULT_PHP');
    }
    if (phpVers.some((it) => it.needsUpdate)) {
      warn.push('PHP_NEEDS_CONFIG_UPDATE');
    }
  }
 
  if (!errors.length) {
    res({
      ready: true,
      ...( warn.length === 0 ? {} : { warnings: warn })
    });
  } else {
    res({
      ready: false,
      errors,
      ...( warn.length === 0 ? {} : { warnings: warn })
    });
  }
});

/**
 * 
 * @returns A promise that resolves to a status report if your system is configured to
 *          use Homebrew
 */
export const checkHomebrew = () => new Promise(async (res) => {
  const errors: HOMEBREW_ERRORS[] = [];

  const brewDir = await getBrewDir();
  if (!brewDir) {
    errors.push('NOT_INSTALLED');
  }

  if (!errors.length) {
    res({
      ready: true,
    });
  } else {
    res({
      ready: false,
      errors,
    })
  }
});

/**
 * Get the prefix dir for homebrew
 * @returns The prefix dir for homebrew
 */
export const getBrewDir = () => execute<string>('brew', {
  args: ['--prefix']
}).task.then((path) => path.trim());