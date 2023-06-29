// import { nginx, hosts } from ".";
// import { readFileSync } from "fs";
// import { SiteProperties } from "./services/nginx";
// import { HostEntry } from "./services/hosts";

// export class Server {
//   site: string;
//   host: string;
//   info: any;

//   constructor(site: string, host: string)
//   {
//     this.site = site;
//     this.host = host;
//   }

//   valid() 
//   {
//     return !!this.site;
//   }

//   enable()
//   {
//     if (!this.host) {
//       throw new Error('Site could not be configured - could not identify a valid hostname');
//     }
//     // hosts.addHost('127.0.0.1', this.host, this.site, 'LibToServe');
//   }

//   disable()
//   {
//     hosts.removeHost('127.0.0.1', this.host);
//   }

//   destroy()
//   {
//     this.disable();
//     nginx.removeSite(this.site);
//   }
// }

// export function listServers() 
// {
//   const sites = nginx.getSites();

//   if (!sites) {
//     throw new Error('No sites available.');
//   }

//   return sites.map(getServerInfo).filter(it => it);
// }

// export function getServerInfo(site: string) {
//   const hostList = hosts.getHostsDef('LibToServe');
//   const confDir = `${nginx.configDir()}/servers`;

//   try {
//     const config = readFileSync(`${confDir}/${site}`).toString();
//     const hostConfig = config.split('\n').find(it => it.trim().startsWith('server_name'))?.trim?.();
//     const hostValue = hostConfig?.split?.(' ')?.[1]?.replace?.(';','')?.trim?.();

//     const host = hostValue ? hostList.find(it => {
//       if (typeof it === 'string') return false;
//       return it.host === hostValue;
//     }) as HostEntry : undefined;

//     const siteInfo = nginx.getSiteInfo(site) as any;

//     return new Server(site, siteInfo['hostName']);
//   } catch {
//     return null;
//   }
// }

// export function createServer(type: string, name: string, host: string, properties: SiteProperties)
// {  
//   // const addedConf = nginx.addSite(type, name, {...properties, hostName: host});
//   // if (!addedConf) {
//   //   throw new Error('Could not add server');
//   // }
//   // hosts.addHost('127.0.0.1', host, name, 'LibToServe');
//   // nginx.restart();
//   notifyUpdate();
// }

// let listeners: (() => void)[] = [];

// export function registerChangeListener(callback: () => void)
// {
//   if (listeners.includes(callback)) return;
//   listeners = [...listeners, callback];
// }

// export function removeChangeListener(callback: () => void)
// {
//   listeners = listeners.filter(it => it != callback);
// }

// export function notifyUpdate()
// {
//   listeners.forEach(it => it());
// }