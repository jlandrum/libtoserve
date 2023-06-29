import { readFileSync, writeFileSync } from 'fs';
import sudo from 'sudo-prompt';

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
    this.comment = comment?.startsWith('#') ? comment.slice(1) : comment;
  }

  toString()
  {
    return `${this.address} ${this.host}${this.comment ? ` # ${this.comment}` : ''}`;
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

export function getHostsDef(inSection?: string): HostLine[]
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
      return typeof it === "string" 
        ? it.trim().startsWith(`## ${inSection} - End ##`) 
        : false;
    })

    if (start === -1 || stop === -1) {
      return [];
    }

    return entries.slice(start, stop) as (HostLine)[];
  }
  return entries as (HostLine)[];
}

export function getHosts(inSection?: string): HostEntry[]
{
  return getHostsDef(inSection).filter((it): it is HostEntry => typeof it !== 'string');  
}

export function getHost(host: string)
{
  return getHostsDef().find(it => {
    return typeof it !== 'string' 
      ? it.host === host 
      : false
  });
}

export function toHostsString(items: HostLine[]) 
{
  return items.map(it => it.toString().trim()).join("\n");
}

export async function writeHosts(hosts: HostLine[]): Promise<boolean>
{
  const promise = new Promise<boolean>((res, rej) => {
    const output = toHostsString(hosts);
    writeFileSync('/tmp/hosts', output);
    sudo.exec('cp /tmp/hosts /etc/hosts', {
      name: 'libtoserve'
    }, function(err,stdout,stderr) {
      err ? rej(err) : res(true)
    });
  });
  return promise;
}

export async function addHost(address: string, host: string, comment?: string, section?: string)
{
  const hosts = getHostsDef();
  const entry = new HostEntry(address, host, comment);

  const existing = hosts.find(it => {
    if (typeof it === "string") return false;
    return it.host === host;
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
      return writeHosts(newHosts);
    } else if (startIndex != stopIndex) {
      throw new Error('Section does not match expected format.');
    } else {
      return writeHosts([...hosts, `## ${section} ##`, entry, `## ${section} - End ##`]);
    }
  } else {
    return writeHosts([...hosts, entry]);
  }
}

export async function removeHost(address: string, host: string): Promise<boolean>
{
  const hosts = getHostsDef();
  const filtered = hosts.filter(it => {
    return typeof it === "string" 
      ? true 
      : !(it.address === address && it.host === host);
  });

  if (filtered.length === hosts.length) return false;
  return writeHosts(filtered);
}

export function removeHostByComment(comment: string): boolean
{
  const hosts = getHostsDef();
  const filtered = hosts.filter(it => {
    if (typeof it === "string") return true;
    return !(it.comment === comment);
  });

  if (filtered.length === hosts.length) return false;
  writeHosts(filtered);

  return true;
}
