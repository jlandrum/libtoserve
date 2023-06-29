import { readFile, writeFile } from "fs/promises";
import sudo from 'sudo-prompt';

const IPRegex = new RegExp(`((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))`);
const HostRegex = new RegExp(`[-.0-9a-z]+`);

/**
 * Gets the host file and converts it to an array of strings, each string
 * representing a line of the hosts file.
 * @returns The host file as an array of lines.
 */
export const getHostFile = () => new Promise<string[]>(async (res,rej) => {
  const buffer = await readFile('/etc/hosts');

  if (!buffer) {
    rej('Hosts file does not exist or could not be read.');
    return;
  }

  res(buffer.toString().split('\n'));
});

/**
 * Gets the line in the hosts file that matches the given host
 * @param host The host to look for
 * @returns The line in the hosts file if found, otherwise undefined
 */
export const getHost = (host: string) => new Promise(async (res, rej) => {
  getHostFile()
    .then((hosts) => {
      const line = hosts.find((str) => {
        const components = str.split(/\s+/).filter(s=>s);
        if (components.length >= 2) {
          return components[1] === host;
        }
      });
      res(line);
    })
    .catch(rej);
});

/**
 * Adds a new host file entry, if it exists.
 * @param host The host entry to add
 * @param address The address to point the host to.
 * @param comment A comment to add to the entry
 * @returns A promise
 */
export const addHost = (host: string, address: string, comment?: string) => new Promise(async (res, rej) => {
  const hostExists = await getHost(host);

  if (!!hostExists) {
    rej('Host already exists');
    return;
  }

  if (!IPRegex.test(address)) {
    rej('Address is not a valid IP address');
    return;
  }

  if (!HostRegex.test(host)) {
    rej('Host is not a valid hostname')
    return;
  }

  getHostFile()
    .then((hosts) => {
      const newHosts = hosts.concat(`${address} ${host}${comment ? ` #${comment}`:''}`).join('\n');
      writeHostFile(newHosts).then(res).catch(rej);
    })
});

/**
 * Removes the specified host from the hosts file, if it exists.
 * @param host The host to remove
 * @returns A promise
 */
export const removeHost = (host: string) => new Promise(async(res, rej) => {
  const hostToRemove = await getHost(host);

  if (!hostToRemove) {
    rej('Host does not exists');
    return;
  }

  getHostFile()
    .then((hosts) => {
      const newHosts = hosts.filter((entry) => entry !== hostToRemove).join('\n') + '\n';
      writeHostFile(newHosts).then(res).catch(rej);
    })
});

/**
 * Writes the host file
 * @param content The content to write
 * @returns A promise
 */
export const writeHostFile = (content: string) => new Promise((res,rej) => {
  writeFile('/tmp/hosts', content)
    .then(() => {
      sudo.exec('cp /tmp/hosts /etc/hosts', {
        name: 'libtoserve'
      }, function(err) {
        err ? rej(err) : res(true)
      });
    })
    .catch(rej);
});

