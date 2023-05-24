import { readFileSync, writeFileSync } from 'fs';


export type HostComment = string;
export type HostLine = (HostEntry|HostComment);

export class HostEntry {
  readonly address: string;
  readonly host : string;
  readonly comment?: string;

  constructor(address: string, host: string, comment?: string) 
  {
    this.address = address;
    this.host = host;
    this.comment = comment?.startsWith('#') ? comment : `#${comment}`;
  }

  toString()
  {
    return `${this.address} ${this.host}${this.comment ? ` ${this.comment}` : ''}`;
  }

  static parse(entry: string) 
  {
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

export function getHosts(inSection?: string): HostLine[]
{
  const buffer = readFileSync('/etc/hosts');
  if (!buffer) {
    throw Error('Hosts file does not exist or could not be read.');
  }

  const text = buffer.toString();    
  const lines = text.split('\n');

  const entries = lines.map((entry) => {
    if (entry.startsWith('#')) {
      return entry as HostComment;
    } else if (!entry.trim()) {
      return "";
    } else {
      return HostEntry.parse(entry);
    }
  })

  if (inSection) {
    const start = entries.findIndex(it => {
      if (typeof it === "string") {
        return it.trim().startsWith(`## ${inSection} ##`);
      }
      return false;
    })    
    
    const stop = entries.findIndex(it => {
      if (typeof it === "string") {
        return it.trim().startsWith(`## ${inSection} - End ##`);
      }
      return false;
    })

    if (start === -1 || stop === -1) {
      throw new Error('Section not found');
    }

    return entries.slice(start, stop) as (HostLine)[];
  }
  return entries as (HostLine)[];
}

export function toHostsString(items: HostLine[]) 
{
  return items.map(it => it.toString().trim()).join("\n");
}

export function writeHosts(hosts: HostLine[])
{
  const output = toHostsString(hosts);
  writeFileSync('/etc/hosts', output);
}

export function addHost(address: string, host: string, comment?: string, section?: string): boolean
{
  const hosts = getHosts();
  const entry = new HostEntry(address, host, comment);

  const existing = hosts.find(it => {
    if (typeof it === "string") return false;
    return it.address === address && it.host === host;
  });

  if (existing) return false;

  if (section) {
    const startIndex = hosts.findIndex((v) => {
      if (typeof v !== "string") return false;
      if (v.startsWith(`## ${section} ##`)) return true;
      return false;
    })      
    
    const stopIndex = hosts.findIndex((v) => {
      if (typeof v !== "string") return false;
      if (v.startsWith(`## ${section} - End ##`)) return true;
      return false;
    })

    if (startIndex !== -1 && stopIndex !== -1) {
      const newHosts = [...hosts.slice(0, stopIndex), entry, ...hosts.slice(stopIndex)];
      writeHosts(newHosts);
    } else if (startIndex != stopIndex) {
      throw new Error('Section does not match expected format.');
    } else {
      writeHosts([...hosts, `## ${section} ##`, entry, `## ${section} - End ##`]);
    }
  } else {
    writeHosts([...hosts, entry]);
  }
  return true;
}

export function removeHost(address: string, host: string): boolean
{
  const hosts = getHosts();
  const filtered = hosts.filter(it => {
    if (typeof it === "string") return true;
    return !(it.address === address && it.host === host);
  });

  if (filtered.length === hosts.length) return false;
  writeHosts(filtered);
  return true;
}

export function removeHostByComment(comment: string): boolean
{
  const hosts = getHosts();
  const filtered = hosts.filter(it => {
    if (typeof it === "string") return true;
    return !(it.comment === comment);
  });

  if (filtered.length === hosts.length) return false;
  writeHosts(filtered);
  return true;
}
