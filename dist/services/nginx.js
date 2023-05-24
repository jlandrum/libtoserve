"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSite = exports.addSite = exports.getSites = exports.configDir = exports.test = exports.restart = exports.getVersion = void 0;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
function getVersion() {
    const exec = (0, child_process_1.spawnSync)('nginx', ['-v'], { stdio: 'pipe' });
    if (exec.status != 0) {
        return false;
    }
    const version = exec.output.toString().split('/')[1].trim();
    return version;
}
exports.getVersion = getVersion;
function restart() {
    const exec = (0, child_process_1.spawnSync)('brew', ['services', 'restart', 'nginx']);
    return exec.status ? false : true;
}
exports.restart = restart;
function test() {
    const exec = (0, child_process_1.spawnSync)('nginx', ['-t']);
    return exec.status ? false : true;
}
exports.test = test;
function configDir() {
    if (!getVersion())
        return false;
    const exec = (0, child_process_1.spawnSync)('nginx', ['-t'], { stdio: 'pipe' });
    if (exec.status != 0) {
        return false;
    }
    const configFile = exec.output.toString().split("\n")[0].split(" ")[4];
    const configPath = configFile.split("/").filter((_, i, a) => i != a.length - 1).join('/');
    return configPath;
}
exports.configDir = configDir;
function getSites() {
    const dir = configDir();
    if (!dir)
        return false;
    return (0, fs_1.readdirSync)(`${dir}/servers`);
}
exports.getSites = getSites;
function addSite(type, name, properties, restartServer = false) {
    const configFile = `${configDir()}/servers/${name}`;
    let template = '';
    try {
        const path = type.startsWith('.') || type.startsWith('/') ? type : `${__dirname}/../../configs/nginx/${type}`;
        template = (0, fs_1.readFileSync)(path).toString();
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
    (0, fs_1.writeFileSync)(configFile, parsedTemplate, {});
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
