import { spawnSync } from "child_process";

export function getVersion() 
{
  const exec = spawnSync('php', ['-v'], { stdio: 'pipe' })
  if (exec.status != 0) {
    throw new Error('php does not appear to be installed.');
  }
  const version = exec.output.toString().split(' ')[1].trim();
  return version;
}
