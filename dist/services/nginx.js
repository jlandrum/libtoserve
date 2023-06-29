"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSiteInfo = exports.removeSite = exports.addSite = exports.getSites = exports.configDir = exports.test = exports.restart = exports.getVersion = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const drupal_1 = __importDefault(require("../configs/nginx/drupal"));
const proxy_1 = __importDefault(require("../configs/nginx/proxy"));
const wordpress_1 = __importDefault(require("../configs/nginx/wordpress"));
const php_1 = __importDefault(require("../configs/nginx/php"));
const util_1 = require("../util");
const siteTypes = {
    drupal: drupal_1.default, proxy: proxy_1.default, wordpress: wordpress_1.default, php: php_1.default
};
function getVersion() {
    try {
        return (0, child_process_1.spawnSync)('nginx', ['-v'], util_1.execParams).stderr.toString().split('/')[1].trim();
    }
    catch {
        return false;
    }
}
exports.getVersion = getVersion;
function restart() {
    const exec = (0, child_process_1.spawnSync)('brew', ['services', 'restart', 'nginx'], util_1.execParams);
    return exec.status ? false : true;
}
exports.restart = restart;
function test() {
    const exec = (0, child_process_1.spawnSync)('nginx', ['-t'], util_1.execParams);
    return exec.status ? false : true;
}
exports.test = test;
function configDir() {
    try {
        const exec = (0, child_process_1.spawnSync)('nginx', ['-t'], util_1.execParams);
        const configFile = exec.stderr.toString().split("\n").find(it => it.includes('the configuration file')).split(" ")[4];
        return configFile.split("/").filter((_, i, a) => i != a.length - 1).join('/');
    }
    catch {
        return false;
    }
}
exports.configDir = configDir;
function getSites() {
    const dir = configDir();
    if (!dir)
        return [];
    return (0, fs_1.readdirSync)(`${dir}/servers`);
}
exports.getSites = getSites;
function addSite(type, name, properties, restartServer = false) {
    const configFile = `${configDir()}/servers/${name}`;
    let template = '';
    try {
        template = type.startsWith('.') || type.startsWith('/') ? (0, fs_1.readFileSync)(type).toString() : (siteTypes[type.toLocaleLowerCase()]);
    }
    catch (e) {
        throw new Error('Site template does not exist. Either supply a built-in type or a path to a valid nginx template.');
    }
    const parsedTemplate = Object.keys(properties).reduce((prev, cur) => {
        return prev.replace(`{{${cur}}}`, properties[cur]);
    }, template);
    const unresolvedProp = parsedTemplate.indexOf('{{');
    if (unresolvedProp != -1) {
        const unresolvedPropEnd = parsedTemplate.indexOf('}}');
        throw new Error(`Template contains unresolved property: ${parsedTemplate.slice(unresolvedProp + 2, unresolvedPropEnd)}`);
    }
    const extendedProps = {
        ...properties,
        type,
        name
    };
    const addConfig = [parsedTemplate, ``, ...Object.keys(extendedProps).map((key) => `##% ${key}: ${extendedProps[key]}`)].join("\n");
    (0, fs_1.writeFileSync)(configFile, addConfig);
    if (!test()) {
        (0, fs_1.rmSync)(configFile);
        throw new Error('An error occured while validating the nginx config. Changes were not saved.');
    }
    if (restartServer) {
        restart();
    }
    return true;
}
exports.addSite = addSite;
function removeSite(name, restartServer = false) {
    const configFile = `${configDir()}/servers/${name}`;
    if (!(0, fs_1.existsSync)(configFile))
        return false;
    (0, fs_1.rmSync)(configFile);
    if (restartServer) {
        restart();
    }
    return true;
}
exports.removeSite = removeSite;
function getSiteInfo(name) {
    const configFile = `${configDir()}/servers/${name}`;
    if (!(0, fs_1.existsSync)(configFile))
        throw new Error('Site does not exist');
    const config = (0, fs_1.readFileSync)(configFile).toString();
    return config.split("\n")
        .filter(it => it.startsWith('##%'))
        .map(it => {
        const values = it.split(' ');
        return [values[1].replace(':', ''), values.slice(2).join(' ')];
    });
}
exports.getSiteInfo = getSiteInfo;
