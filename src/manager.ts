import { HostEntry } from "./hosts";
import { nginx, hosts } from ".";
import { readFileSync } from "fs";
import { SiteProperties } from "./services/nginx";

export class Server {
  host?: HostEntry;
  site: string;
  url?: string;

  constructor(site: string, url?: string, host?: HostEntry)
  {
    this.host = host;
    this.site = site;
    this.url = url;
  }

  valid() 
  {
    return !!this.host && !!this.site;
  }

  enable()
  {
    if (!this.url) {
      throw new Error('Site could not be configured - could not identify a valid hostname');
    }
    hosts.addHost('127.0.0.1', this.url, this.site, 'LibToServe');
  }

  disable()
  {
    if (!this.host) {
      throw new Error('Site could not be configured - could not identify a unique identifier');
    }
    hosts.removeHostByComment(this.host.comment || '');
  }

  destroy()
  {
    if (this.host) {
      this.disable();
    }
    nginx.removeSite(this.site);
  }
}

export function listServers() 
{
  const sites = nginx.getSites();
  const hostList = hosts.getHosts('LibToServe');

  const confDir = `${nginx.configDir()}/servers`;

  if (!sites) {
    throw new Error('No sites available.');
  }

  return sites.map((site) => {
    const config = readFileSync(`${confDir}/${site}`).toString();
    const hostConfig = config.split('\n').find(it => it.trim().startsWith('server_name'))?.trim?.();
    const hostValue = hostConfig?.split?.(' ')?.[1]?.replace?.(';','')?.trim?.();

    const host = hostValue ? hostList.find(it => {
      if (typeof it === 'string') return false;
      return it.host === hostValue;
    }) as HostEntry : undefined;

    return new Server(site, hostValue, host);
  });
}

export function createServer(type: string, name: string, host: string, properties: SiteProperties)
{  
  const addedConf = nginx.addSite(type, name, {...properties, hostName: host});
  if (!addedConf) {
    throw new Error('Could not add server');
  }
  hosts.addHost('127.0.0.1', host, name, 'LibToServe');
  nginx.restart();
}