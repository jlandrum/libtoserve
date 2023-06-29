"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConfig = exports.uninstallVersion = exports.installVersion = exports.getVersions = exports.restart = exports.getVersion = void 0;
const util_1 = require("../util");
const promises_1 = require("fs/promises");
const system_1 = require("./system");
const fs_1 = require("fs");
;
/**
 * Gets the default version of PHP installed
 * @returns The version of PHP installed as the main binary
 */
const getVersion = () => (0, util_1.execute)('php', {
    args: ['-v']
}).task.then((v) => v.split(/\s+/));
exports.getVersion = getVersion;
/**
 * Restarts all php-fpm servers
 * @returns A promise that resolves if the restart was successful, or throws if not
 */
const restart = async () => {
    const tasks = (await (0, exports.getVersions)()).map((v) => (0, util_1.execute)('brew', {
        args: ['services', 'restart', v.service]
    }).task);
    return Promise.all(tasks);
};
exports.restart = restart;
/**
 * Gets the PHP versions installed and available to the user
 * @param extended If true, includes technical details
 * @returns An array of PHP versions installed
 */
const getVersions = (extended = false) => new Promise((res, rej) => {
    (0, system_1.getBrewDir)().then((dir) => {
        (0, promises_1.readdir)(`${dir}/Cellar`).then((v) => {
            const versions = v.filter((name) => name.startsWith('php'));
            const versionMap = Promise.all(versions.map(async (version) => {
                const versions = (0, fs_1.readdirSync)(`${dir}/Cellar/${version}`).map((v) => ({
                    version: v,
                    path: `${dir}/Cellar/${version}/${v}`
                }));
                const isDefault = version === 'php';
                const vVersion = isDefault ? versions[0].version.split('.').filter((_, i) => i <= 1).join('.')
                    : version.split('@')[1];
                const extendedData = extended ? await getTechnicalDetails(vVersion, isDefault) : {};
                const service = version;
                return {
                    name: version === 'php' ? 'default' : vVersion,
                    versions,
                    service,
                    ...extendedData
                };
            }));
            res(versionMap);
        }).catch(() => rej('Homebrew does not appear to be installed.'));
    })
        .catch(() => rej('Homebrew does not appear to be installed.'));
});
exports.getVersions = getVersions;
/**
 * Installs a new version of PHP and immediately updates the config
 * so that PHP-FPM runs on it's own port, allowing multiple simultaneous
 * versions to co-exist
 * @param version The version to install
 * @returns a task runner, allowing the process to be canceled
 */
const installVersion = (version) => {
    const runner = (0, util_1.execute)('brew', {
        args: ['install', `shivammathur/php/php@${version}`]
    });
    runner.task.then(exports.updateConfig);
    return runner;
};
exports.installVersion = installVersion;
/**
 * Uninstalls the given version of PHP
 * @param version The version to install
 * @returns a task runner, allowing the process to be canceled
 */
const uninstallVersion = (version) => {
    const runner = (0, util_1.execute)('brew', {
        args: ['uninstall', `shivammathur/php/php@${version}`]
    });
    return runner;
};
exports.uninstallVersion = uninstallVersion;
/**
 * Updates the necessary config files to ensure PHP is configured as expected.
 * @param version The version to update
 * @returns A promise that resolves once the update has completed, rejects on error
 */
const updateConfig = () => new Promise(async (res, rej) => {
    const versions = await (0, exports.getVersions)(true);
    const needsUpdate = versions.filter((ver) => ver.needsUpdate);
    try {
        if (needsUpdate.length === 0) {
            res(true);
        }
        else {
            const result = await needsUpdate.map(async (ver) => {
                const config = ver.fpm?.config;
                if (!ver.fpm || !config) {
                    return false;
                }
                const configText = (await (0, promises_1.readFile)(config))
                    .toString()
                    .replace(/\s?listen\s+=\s+([0-9\.]+):([0-9]+)/, `\nlisten = 127.0.0.1:${ver.fpm.preferredPort}`);
                return await (0, promises_1.writeFile)(config, configText) === undefined;
            });
            result.every((res) => res) ? (0, exports.restart)().then(() => res(true)) : rej(undefined);
        }
    }
    catch (e) {
        rej(e);
    }
});
exports.updateConfig = updateConfig;
const getTechnicalDetails = (ver, isDefault = false) => new Promise((req, rej) => {
    (0, system_1.getBrewDir)().then(async (dir) => {
        let configFile = undefined;
        let phpfpmAddress = undefined;
        let needsUpdate = false;
        if ((0, fs_1.existsSync)(`${dir}/etc/php/${ver}/php-fpm.d/www.conf`)) {
            configFile = `${dir}/etc/php/${ver}/php-fpm.d/www.conf`;
        }
        else if ((0, fs_1.existsSync)(`${dir}/etc/php/${ver}/php-fpm.conf`)) {
            configFile = `${dir}/etc/php/${ver}/php-fpm.conf`;
        }
        if (configFile) {
            phpfpmAddress = (await (0, promises_1.readFile)(configFile))?.toString()
                ?.split('\n')
                ?.find((it) => it.trim().startsWith('listen'))
                ?.split('=')
                ?.reverse()?.[0]
                ?.trim();
        }
        const port = phpfpmAddress ? phpfpmAddress.split(':').reverse()[0] : undefined;
        const preferredPort = isDefault ? '9000' : `90${ver.replace('.', '')}`;
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
        });
    })
        .catch(() => rej('Homebrew does not appear to be installed.'));
});
