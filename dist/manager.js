"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = exports.listServers = exports.Server = void 0;
const _1 = require(".");
const fs_1 = require("fs");
class Server {
    host;
    site;
    url;
    constructor(site, url, host) {
        this.host = host;
        this.site = site;
        this.url = url;
    }
    valid() {
        return !!this.host && !!this.site;
    }
    enable() {
        if (!this.url) {
            throw new Error('Site could not be configured - could not identify a valid hostname');
        }
        _1.hosts.addHost('127.0.0.1', this.url, this.site, 'LibToServe');
    }
    disable() {
        if (!this.host) {
            throw new Error('Site could not be configured - could not identify a unique identifier');
        }
        _1.hosts.removeHostByComment(this.host.comment || '');
    }
    destroy() {
        if (this.host) {
            this.disable();
        }
        _1.nginx.removeSite(this.site);
    }
}
exports.Server = Server;
function listServers() {
    const sites = _1.nginx.getSites();
    const hostList = _1.hosts.getHosts('LibToServe');
    const confDir = `${_1.nginx.configDir()}/servers`;
    if (!sites) {
        throw new Error('No sites available.');
    }
    return sites.map((site) => {
        const config = (0, fs_1.readFileSync)(`${confDir}/${site}`).toString();
        const hostConfig = config.split('\n').find(it => it.trim().startsWith('server_name'))?.trim?.();
        const hostValue = hostConfig?.split?.(' ')?.[1]?.replace?.(';', '')?.trim?.();
        const host = hostValue ? hostList.find(it => {
            if (typeof it === 'string')
                return false;
            return it.host === hostValue;
        }) : undefined;
        return new Server(site, hostValue, host);
    });
}
exports.listServers = listServers;
function createServer(type, name, host, properties) {
    const addedConf = _1.nginx.addSite(type, name, { ...properties, hostName: host });
    if (!addedConf) {
        throw new Error('Could not add server');
    }
    _1.hosts.addHost('127.0.0.1', host, name, 'LibToServe');
    _1.nginx.restart();
}
exports.createServer = createServer;
