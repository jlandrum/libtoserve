import { spawnSync } from "child_process";
import { execParams } from '../util';

export function getVersion() 
{
  const exec = spawnSync('php', ['-v'], { stdio: 'pipe', ...execParams })
  if (exec.status != 0) {
    throw new Error('php does not appear to be installed.');
  }
  const version = exec.stdout.toString().split(' ')[1].trim();
  return version;
}
