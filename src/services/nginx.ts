import { spawnSync } from "child_process";
import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "fs";

export interface SiteProperties {
  hostName: string;
  [key: string]: string;
}

export function getVersion(): string|false
{
  const exec = spawnSync('nginx', ['-v'], { stdio: 'pipe' })
  if (exec.status != 0) {
    return false;
  }
  const version = exec.output.toString().split('/')[1].trim();
  return version;
}

export function restart(): boolean
{
  const exec = spawnSync('brew', ['services', 'restart', 'nginx']);
  return exec.status ? false : true;
} 

export function test(): boolean
{
  const exec = spawnSync('nginx', ['-t']);
  return exec.status ? false : true;
}

export function configDir(): string|false
{
  if (!getVersion()) return false;
  const exec = spawnSync('nginx', ['-t'], { stdio: 'pipe' })
  if (exec.status != 0) {
    return false;
  }
  const configFile = exec.output.toString().split("\n")[0].split(" ")[4];
  const configPath = configFile.split("/").filter((_,i,a) => i!=a.length-1).join('/');

  return configPath;
}

export function getSites()
{
  const dir = configDir();
  if (!dir) return false;
  return readdirSync(`${dir}/servers`);
}

export function addSite(type: string, name: string, properties: SiteProperties, restartServer: boolean = false)
{
  const configFile = `${configDir()}/servers/${name}`;
  let template = '';

  try {
    const path = type.startsWith('.') || type.startsWith('/') ? type : `${__dirname}/../../configs/nginx/${type}`;
    template = readFileSync(path).toString();
  } catch (e) {
    throw new Error('Site template does not exist. Either supply a built-in type or a path to a valid nginx template.');
  }

  const parsedTemplate = Object.keys(properties).reduce((prev,cur) => {
    return prev.replace(`{{${cur}}}`, properties[cur]);
  }, template);

  const unresolvedProp = parsedTemplate.indexOf('{{');
  
  if (unresolvedProp != -1) {    
    const unresolvedPropEnd = parsedTemplate.indexOf('}}');
    throw new Error(`Template contains unresolved property: ${parsedTemplate.slice(unresolvedProp+2, unresolvedPropEnd)}`)
  }

  writeFileSync(configFile, parsedTemplate, {});

  if (!test()) {
    rmSync(configFile);
    throw new Error('An error occured while validating the nginx config. Changes were not saved.');
  }

  if (restartServer) {
    restart();
  }

  return true;
}

export function removeSite(name: string, restartServer: boolean = false): boolean
{
  const configFile = `${configDir()}/servers/${name}`;
  if (!existsSync(configFile)) return false;
  rmSync(configFile);

  if (restartServer) {
    restart();
  }

  return true;
}
