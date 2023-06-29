"use strict";
/**
 * TODO: Make server config templates more robust
*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSiteInfo = exports.removeSite = exports.addSite = exports.getSites = exports.configDir = exports.test = exports.restart = exports.getVersion = void 0;
const fs_1 = require("fs");
const drupal_1 = __importDefault(require("../configs/nginx/drupal"));
const proxy_1 = __importDefault(require("../configs/nginx/proxy"));
const wordpress_1 = __importDefault(require("../configs/nginx/wordpress"));
const php_1 = __importDefault(require("../configs/nginx/php"));
const util_1 = require("../util");
const promises_1 = require("fs/promises");
const siteTypes = {
    drupal: drupal_1.default, proxy: proxy_1.default, wordpress: wordpress_1.default, php: php_1.default
};
const defaultProps = {
    phpfpmPort: 9000
};
/**
 * Gets the version of nginx installed
 * @returns The version of nginx installed
 */
const getVersion = () => (0, util_1.execute)('nginx', {
    args: ['-v'],
    ignoreCode: true,
}).task.then((ver) => ver.split('/')[1].trim());
exports.getVersion = getVersion;
/**
 * Restart the nginx service
 * @returns Restarts nginx
 */
const restart = () => (0, util_1.execute)('brew', {
    args: ['services', 'restart', 'nginx']
}).task;
exports.restart = restart;
/**
 * Test the nginx config to ensure it is correct
 * @returns The results of the nginx test
 */
const test = () => (0, util_1.execute)('nginx', {
    args: ['-t']
}).task;
exports.test = test;
/**
 * Get the config dir for nginx
 * @returns The config directory for nginx
 */
const configDir = () => (0, util_1.execute)('nginx', {
    args: ['-t']
}).task.then((result) => result.split(/\s+/).find((it) => it.startsWith('/')).replace('/nginx.conf', ''));
exports.configDir = configDir;
/**
 * Gets a list of sites available
 * @returns The list of sites available
 */
const getSites = () => new Promise(async (res, rej) => {
    const dir = await (0, exports.configDir)();
    if (!dir) {
        rej();
        return;
    }
    (0, promises_1.readdir)(`${dir}/servers`).then(res);
});
exports.getSites = getSites;
/**
 * Add a new site config to nginx
 * @param type The type of site, either a predefined site type or a path to a template file
 * @param name The name of the site
 * @param properties Properties for the template.
 * @param restartServer If true, restart the server on completion and verification.
 * @returns
 */
const addSite = (type, name, properties, restartServer = false) => new Promise(async (res, rej) => {
    const configFile = `${(0, exports.configDir)()}/servers/${name}`;
    let template = '';
    const allProps = { ...defaultProps, properties };
    try {
        template = type.startsWith('.') || type.startsWith('/') ? (0, fs_1.readFileSync)(type).toString() : (siteTypes[type.toLocaleLowerCase()]);
    }
    catch (e) {
        throw new Error('Site template does not exist. Either supply a built-in type or a path to a valid nginx template.');
    }
    const parsedTemplate = Object.keys(allProps).reduce((prev, cur) => {
        return prev.replaceAll(`{{${cur}}}`, allProps[cur]);
    }, template);
    const unresolvedProp = parsedTemplate.indexOf('{{');
    if (unresolvedProp != -1) {
        const unresolvedPropEnd = parsedTemplate.indexOf('}}');
        const unresolvedPropName = parsedTemplate.slice(unresolvedProp + 2, unresolvedPropEnd);
        rej(`Unresolved template property: ${unresolvedPropName}`);
        return;
    }
    const extendedProps = {
        ...properties,
        type,
        name
    };
    const addConfig = [parsedTemplate, ``, ...Object.keys(extendedProps).map((key) => `##% ${key}: ${extendedProps[key]}`)].join("\n");
    await (0, promises_1.writeFile)(configFile, addConfig);
    if (!await (0, exports.test)()) {
        (0, fs_1.rmSync)(configFile);
        rej('An error occured while validating the nginx config. Changes were not saved.');
        return;
    }
    if (restartServer) {
        await (0, exports.restart)();
    }
    res(true);
});
exports.addSite = addSite;
/**
 * Remove the given site by name
 * @param name Name of the site to remove
 * @param restartServer Restarts the server after completion
 * @returns
 */
const removeSite = (name, restartServer = false) => new Promise(async (res, rej) => {
    const configFile = `${await (0, exports.configDir)()}/servers/${name}`;
    if (!(0, fs_1.existsSync)(configFile)) {
        rej('Site does not exist.');
        return;
    }
    (0, fs_1.rmSync)(configFile);
    if (restartServer) {
        await (0, exports.restart)();
    }
    res(true);
});
exports.removeSite = removeSite;
/**
 * Fetches the libtoserve site info for a given site.
 * @param name The name of the site
 * @returns If the site was created with this library, the values used to create the site.
 */
const getSiteInfo = (name) => new Promise(async (res, rej) => {
    const configFile = `${await (0, exports.configDir)()}/servers/${name}`;
    if (!(0, fs_1.existsSync)(configFile)) {
        rej('Site does not exist');
        return;
    }
    const config = (await (0, promises_1.readFile)(configFile)).toString();
    const info = config.split("\n")
        .filter(it => it.startsWith('##%'))
        .map(it => {
        const values = it.split(' ');
        return [values[1].replace(':', ''), values.slice(2).join(' ')];
    })
        .reduce((p, c) => ({ ...p, [c[0]]: c[1] }), {});
    res(info);
});
exports.getSiteInfo = getSiteInfo;
