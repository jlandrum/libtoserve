import { spawnSync } from "child_process";
import { execParams, execute } from '../util';
import { readFile, readdir, writeFile } from "fs/promises";
import { getBrewDir } from "./system";
import { existsSync, readdirSync } from "fs";

export interface PHPVersion {
  name: string;
  service: string;
  versions: {
    version: string;
    path: string;
  }[];
  needsUpdate?: boolean;
  fpm?: {
    config: string;
    address: string;
    port: string;
    preferredPort: string;
  }
};

/**
 * Gets the default version of PHP installed
 * @returns The version of PHP installed as the main binary
 */
export const getVersion = () => execute('php', {
  args: ['-v']
}).task.then((v) => v.split(/\s+/));

/**
 * Restarts all php-fpm servers
 * @returns A promise that resolves if the restart was successful, or throws if not
 */
export const restart = async (): Promise<any> => {
  const tasks = (await getVersions()).map((v) => 
    execute<any>('brew', {
      args: ['services', 'restart', v.service]
    }).task
  );
  return Promise.all(tasks);
};

/**
 * Gets the PHP versions installed and available to the user
 * @param extended If true, includes technical details
 * @returns An array of PHP versions installed
 */
export const getVersions = (extended: boolean = false) => new Promise<PHPVersion[]>((res, rej) => {
  getBrewDir().then((dir) => {
    readdir(`${dir}/Cellar`).then((v) => {
      const versions = v.filter((name) => name.startsWith('php'));

      const versionMap = Promise.all(
        versions.map(async (version) => {
          const versions = readdirSync(`${dir}/Cellar/${version}`).map((v) => ({
            version: v,
            path: `${dir}/Cellar/${version}/${v}`
          }));

          const isDefault = version === 'php';

          const vVersion = isDefault ? versions[0].version.split('.').filter((_,i) => i <= 1).join('.') 
                                     : version.split('@')[1];

          const extendedData = extended ? await getTechnicalDetails(vVersion, isDefault) : {};

          const service = version;

          return {
            name: version === 'php' ? 'default' : vVersion,
            versions,
            service,
            ...extendedData
          }
        })
      );
      
      res(versionMap);

    }).catch(() => rej('Homebrew does not appear to be installed.'))
  })
  .catch(() => rej('Homebrew does not appear to be installed.'));
});

/**
 * Installs a new version of PHP and immediately updates the config
 * so that PHP-FPM runs on it's own port, allowing multiple simultaneous 
 * versions to co-exist
 * @param version The version to install
 * @returns a task runner, allowing the process to be canceled
 */
export const installVersion = (version: string) => {
  const runner = execute('brew', {
    args: ['install', `shivammathur/php/php@${version}`],
    params: {
      shell: true
    }
  });
  runner.task.then(updateConfig);
  return runner;
}

/**
 * Uninstalls the given version of PHP
 * @param version The version to install
 * @returns a task runner, allowing the process to be canceled
 */
export const uninstallVersion = (version: string) => {
  const runner = execute('brew', {
    args: ['uninstall', `shivammathur/php/php@${version}`]
  });
  return runner;
}


/**
 * Updates the necessary config files to ensure PHP is configured as expected.
 * @param version The version to update
 * @returns A promise that resolves once the update has completed, rejects on error
 */
export const updateConfig = () => new Promise(async (res, rej) => {
  const versions = await getVersions(true);
  const needsUpdate = versions.filter((ver) => ver.needsUpdate);

  try {
    if (needsUpdate.length === 0) {
      res(true);
    } else {
      const result = await needsUpdate.map(async (ver) => {
        const config = ver.fpm?.config;
        if (!ver.fpm || !config) { return false }

        const configText = (await readFile(config))
          .toString()
          .replace(/\s?listen\s+=\s+([0-9\.]+):([0-9]+)/, `\nlisten = 127.0.0.1:${ver.fpm.preferredPort}`)
      
        return await writeFile(config, configText) === undefined;
      })
      result.every((res) => res) ? restart().then(() => res(true)) : rej(undefined);
    }
  } catch (e) { rej(e) }
});

const getTechnicalDetails = (ver: string, isDefault: boolean = false) => new Promise<object>((req, rej) => {
  getBrewDir().then(async (dir) => {
    let configFile = undefined;
    let phpfpmAddress = undefined;
    let needsUpdate = false;

    if (existsSync(`${dir}/etc/php/${ver}/php-fpm.d/www.conf`)) {
      configFile = `${dir}/etc/php/${ver}/php-fpm.d/www.conf`;
    } else if (existsSync(`${dir}/etc/php/${ver}/php-fpm.conf`)) {
      configFile = `${dir}/etc/php/${ver}/php-fpm.conf`;
    }

    if (configFile) {
      phpfpmAddress = (await readFile(configFile))?.toString()
                            ?.split('\n')
                            ?.find((it) => it.trim().startsWith('listen'))
                            ?.split('=')
                            ?.reverse()?.[0]
                            ?.trim();
    }

    const port = phpfpmAddress ? phpfpmAddress.split(':').reverse()[0] : undefined;
    const preferredPort = isDefault ? '9000' : `90${ver.replace('.','')}`;

    if (preferredPort !== port) {
      needsUpdate = true;
    }

    req({
      needsUpdate,
      fpm: {
        config: configFile,
        address: phpfpmAddress,
        port: port,
        preferredPort
      }
    })
  })
  .catch(() => rej('Homebrew does not appear to be installed.'));
});