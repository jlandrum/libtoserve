import { spawnSync } from "child_process";
import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "fs";

import drupal from '../configs/nginx/drupal';
import proxy from '../configs/nginx/proxy';
import wordpress from '../configs/nginx/wordpress';
import php from '../configs/nginx/php';
import { execParams } from "../util";

const siteTypes: any = {
  drupal, proxy, wordpress, php
}

export interface SiteProperties {
  hostName: string;
  [key: string]: string;
}

export function getVersion(): string|false
{
  try {
    return spawnSync('nginx', ['-v'], execParams).stderr.toString().split('/')[1].trim();
  } catch {
    return false;
  }
}

export function restart(): boolean
{
  const exec = spawnSync('brew', ['services', 'restart', 'nginx'], execParams);
  return exec.status ? false : true;
} 

export function test(): boolean
{
  const exec = spawnSync('nginx', ['-t'], execParams);
  return exec.status ? false : true;
}

export function configDir(): string|false
{
  try {
    const exec = spawnSync('nginx', ['-t'], execParams)
    const configFile = exec.stderr.toString().split("\n").find(it => it.includes('the configuration file'))!!.split(" ")[4];
    return configFile.split("/").filter((_,i,a) => i!=a.length-1).join('/');
  } catch {
    return false;
  }
}

export function getSites()
{
  const dir = configDir();
  if (!dir) return [];
  return readdirSync(`${dir}/servers`);
}

export function addSite(type: string, name: string, properties: SiteProperties, restartServer: boolean = false)
{
  const configFile = `${configDir()}/servers/${name}`;
  let template = '';

  try {
    template = type.startsWith('.') || type.startsWith('/') ? readFileSync(type).toString() : (siteTypes[type.toLocaleLowerCase()]);
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

  const extendedProps: any = {
    ...properties,
    type,
    name
  }

  const addConfig = [parsedTemplate, ``, ...Object.keys(extendedProps).map((key) => `##% ${key}: ${extendedProps[key]}`)].join("\n");

  writeFileSync(configFile, addConfig);

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

export function getSiteInfo(name: string) 
{
  const configFile = `${configDir()}/servers/${name}`;
  if (!existsSync(configFile)) throw new Error('Site does not exist');

  const config = readFileSync(configFile).toString();
  return config.split("\n")
               .filter(it => it.startsWith('##%'))
               .map(it => {
                const values = it.split(' ');
                return [values[1].replace(':',''), values.slice(2).join(' ')]
               });
}
