/** 
 * TODO: Make server config templates more robust
*/

import { readFileSync, rmSync, existsSync } from "fs";

import drupal from '../configs/nginx/drupal';
import proxy from '../configs/nginx/proxy';
import wordpress from '../configs/nginx/wordpress';
import php from '../configs/nginx/php';
import { execute } from "../util";
import { readFile, readdir, writeFile } from "fs/promises";

const siteTypes: any = {
  drupal, proxy, wordpress, php
}

export interface SiteProperties {
  hostName: string;
  [key: string]: string;
}

const defaultProps = {
  phpfpmPort: 9000
}

/**
 * Gets the version of nginx installed
 * @returns The version of nginx installed
 */
export const getVersion = () => execute('nginx', {
  args: ['-v'],
  ignoreCode: true,
}).task.then((ver) => ver.split('/')[1].trim());

/**
 * Restart the nginx service
 * @returns Restarts nginx
 */
export const restart = () => execute('brew', {
  args: ['services', 'restart', 'nginx']
}).task;

/**
 * Test the nginx config to ensure it is correct
 * @returns The results of the nginx test
 */
export const test = () => execute('nginx', {
  args: ['-t']
}).task;

/**
 * Get the config dir for nginx
 * @returns The config directory for nginx
 */
export const configDir = () => execute('nginx', {
  args: ['-t']
}).task.then((result) => result.split(/\s+/).find((it: string) => it.startsWith('/')).replace('/nginx.conf',''))

/**
 * Gets a list of sites available
 * @returns The list of sites available
 */
export const getSites = () => new Promise(async (res, rej) => {
  const dir = await configDir();
  if (!dir) {
    rej();
    return;
  }
  readdir(`${dir}/servers`).then(res);
})

/**
 * Add a new site config to nginx
 * @param type The type of site, either a predefined site type or a path to a template file
 * @param name The name of the site
 * @param properties Properties for the template.
 * @param restartServer If true, restart the server on completion and verification.
 * @returns 
 */
export const addSite = (type: typeof siteTypes | string,
                        name: string,
                        properties: SiteProperties,
                        restartServer: boolean = false) => new Promise(async (res, rej) => {
  const configFile = `${await configDir()}/servers/${name}`;
  let template = '';

  const allProps: any = {...defaultProps, ...properties};

  try {
    template = type.startsWith('.') || type.startsWith('/') ? readFileSync(type).toString() : (siteTypes[type.toLocaleLowerCase()]);
  } catch (e) {
    throw new Error('Site template does not exist. Either supply a built-in type or a path to a valid nginx template.');
  }

  const parsedTemplate = Object.keys(allProps).reduce((prev,cur) => {
    return prev.replaceAll(`{{${cur}}}`, allProps[cur]);
  }, template);


  const unresolvedProp = parsedTemplate.indexOf('{{');

  if (unresolvedProp != -1) {    
    const unresolvedPropEnd = parsedTemplate.indexOf('}}');
    const unresolvedPropName = parsedTemplate.slice(unresolvedProp+2, unresolvedPropEnd);
    rej(`Unresolved template property: ${unresolvedPropName}`);
    return;
  }

  const extendedProps: any = {
    ...properties,
    type,
    name
  }

  const addConfig = [parsedTemplate, ``, ...Object.keys(extendedProps).map((key) => `##% ${key}: ${extendedProps[key]}`)].join("\n");

  await writeFile(configFile, addConfig);

  if (!await test()) {
    rmSync(configFile);
    rej('An error occured while validating the nginx config. Changes were not saved.');
    return;
  }

  if (restartServer) {
    await restart();
  }
  
  res(true);
});

/**
 * Remove the given site by name
 * @param name Name of the site to remove
 * @param restartServer Restarts the server after completion
 * @returns 
 */
export const removeSite = (name: string, restartServer: boolean = false) => new Promise(async (res,rej) => {
  const configFile = `${await configDir()}/servers/${name}`;

  if (!existsSync(configFile)) {
    rej('Site does not exist.');
    return;
  }

  rmSync(configFile);

  if (restartServer) {
    await restart();
  }

  res(true);
})

/**
 * Fetches the libtoserve site info for a given site.
 * @param name The name of the site
 * @returns If the site was created with this library, the values used to create the site.
 */
export const getSiteInfo = (name: string) => new Promise(async (res, rej) => { 
  const configFile = `${await configDir()}/servers/${name}`;
  if (!existsSync(configFile)) {
    rej('Site does not exist');
    return;
  }

  const config = (await readFile(configFile)).toString();

  const info = config.split("\n")
                     .filter(it => it.startsWith('##%'))
                     .map(it => {
                       const values = it.split(' ');
                       return [values[1].replace(':',''), values.slice(2).join(' ')]
                     })
                     .reduce((p, c) => ({...p, [c[0]]: c[1] }), {});

  res(info);
})
