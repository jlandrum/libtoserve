"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeHostByComment = exports.removeHost = exports.addHost = exports.writeHosts = exports.toHostsString = exports.getHosts = exports.HostEntry = void 0;
const fs_1 = require("fs");
const manager_1 = require("./manager");
class HostEntry {
    address;
    host;
    comment;
    constructor(address, host, comment) {
        this.address = address;
        this.host = host;
        this.comment = comment?.startsWith('#') ? comment.slice(1) : `${comment}`;
    }
    toString() {
        return `${this.address} ${this.host}${this.comment ? `#${this.comment}` : ''}`;
    }
    static parse(entry) {
        const parsed = entry.trim().split(/\s+/g).map(it => it.trim());
        if (parsed.length < 2) {
            throw new Error(`Host definition is not valid: ${entry}`);
        }
        const address = parsed[0];
        const host = parsed[1];
        const comment = parsed.slice(2).join(' ');
        return new HostEntry(address, host, comment ? comment : undefined);
    }
}

exports.HostEntry = HostEntry;
function getHosts(inSection) {
    const buffer = (0, fs_1.readFileSync)('/etc/hosts');
    if (!buffer) {
        throw Error('Hosts file does not exist or could not be read.');
    }
    const text = buffer.toString();
    const lines = text.split('\n');
    const entries = lines.map((entry) => {
        if (entry.startsWith('#')) {
            return entry;
        }
        else if (!entry.trim()) {
            return "";
        }
        else {
            return HostEntry.parse(entry);
        }
    });
    if (inSection) {
        const start = entries.findIndex(it => {
            if (typeof it === "string") {
                return it.trim().startsWith(`## ${inSection} ##`);
            }
            return false;
        });
        const stop = entries.findIndex(it => {
            if (typeof it === "string") {
                return it.trim().startsWith(`## ${inSection} - End ##`);
            }
            return false;
        });
        if (start === -1 || stop === -1) {
            throw new Error('Section not found');
        }
        return entries.slice(start, stop);
    }
    return entries;
}
exports.getHosts = getHosts;
function toHostsString(items) {
    return items.map(it => it.toString().trim()).join("\n");
}
exports.toHostsString = toHostsString;
function writeHosts(hosts) {
    const output = toHostsString(hosts);
    (0, fs_1.writeFileSync)('/etc/hosts', output);
}
exports.writeHosts = writeHosts;
function addHost(address, host, comment, section) {
    const hosts = getHosts();
    const entry = new HostEntry(address, host, comment);
    const existing = hosts.find(it => {
        if (typeof it === "string")
            return false;
        return it.address === address && it.host === host;
    });
    if (existing)
        return false;
    if (section) {
        const startIndex = hosts.findIndex((v) => {
            if (typeof v !== "string")
                return false;
            if (v.startsWith(`## ${section} ##`))
                return true;
            return false;
        });
        const stopIndex = hosts.findIndex((v) => {
            if (typeof v !== "string")
                return false;
            if (v.startsWith(`## ${section} - End ##`))
                return true;
            return false;
        });
        if (startIndex !== -1 && stopIndex !== -1) {
            const newHosts = [...hosts.slice(0, stopIndex), entry, ...hosts.slice(stopIndex)];
            writeHosts(newHosts);
        }
        else if (startIndex != stopIndex) {
            throw new Error('Section does not match expected format.');
        }
        else {
            writeHosts([...hosts, `## ${section} ##`, entry, `## ${section} - End ##`]);
        }
    }
    else {
        writeHosts([...hosts, entry]);
    }
    (0, manager_1.notifyUpdate)();
    return true;
}
exports.addHost = addHost;
function removeHost(address, host) {
    const hosts = getHosts();
    const filtered = hosts.filter(it => {
        if (typeof it === "string")
            return true;
        return !(it.address === address && it.host === host);
    });
    if (filtered.length === hosts.length)
        return false;
    writeHosts(filtered);
    (0, manager_1.notifyUpdate)();
    return true;
}
exports.removeHost = removeHost;
function removeHostByComment(comment) {
    const hosts = getHosts();
    const filtered = hosts.filter(it => {
        if (typeof it === "string")
            return true;
        return !(it.comment === comment);
    });
    if (filtered.length === hosts.length)
        return false;
    writeHosts(filtered);
    (0, manager_1.notifyUpdate)();
    return true;
}
exports.removeHostByComment = removeHostByComment;
