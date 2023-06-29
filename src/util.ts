import { spawn } from "child_process";

export const noop = ()=>{}

export const execParams = {
  env: {...process.env, PATH: process.env.PATH+':/opt/homebrew/bin:/usr/local/bin' }
}

export interface ExecuteArgs {
  args?: string[];
  params?: any;
  process?: (data: string) => string;
  
  ignoreCode?: boolean;
  ongoing?: boolean;

  onData?: (data: string) => void;
  onError?: (data: string) => void;
}

export interface Task<T> {
  task: Promise<T>;
  cancel: () => void;
}

export class CancellablePromise<T> {
  readonly task: Promise<T>;
  readonly doCancel: () => void;

  constructor(exec: (res: (value: T | PromiseLike<T>) => void, 
                     rej: (reason?: any) => void,
                     onCancel: (handler: () => void) => void) => void) {
    let cancel = () => {};
    this.task = new Promise((res, rej) => exec(res, rej, (handler: () => void) => {
      cancel = handler;
    }));
    this.doCancel = cancel;
  }

  public cancel() {
    return this.doCancel();
  }

  public then(onfulfilled?: ((value: T) => T | PromiseLike<T>) | null | undefined, onrejected?: ((reason: any) => PromiseLike<never>) | null | undefined) {
    this.task.then(onfulfilled, onrejected);
    return this;
  }

  public catch(onrejected?: ((reason: any) => PromiseLike<never>) | null | undefined) {
    this.task.catch(onrejected);
    return this;
  }

  public finally(onfinally?: (() => void) | null | undefined) {
    this.task.finally(onfinally);
    return this;
  }
}

export function execute<T,>(command: string,
                            args: ExecuteArgs): Task<T> {
  const promise = new CancellablePromise<T>((res,rej, onCancel) => {
    let response = '';
    let error = '';
    let hasError = false;
    
    const proc = spawn(command, args.args, {...execParams, ...args.params})
    
    onCancel(() => proc.kill());

    proc.on('error', () => {
      hasError = true;
      error = 'Command not found';
    });

    proc.stdout.on('data', (data) => {
      const str = data.toString();
      if (!args.ongoing) {
        response += str;
      }
      args.onData?.(str);
    });
 
    proc.stderr.on('data', (data) => {
      const str = data.toString();
      error += str;
      args.onError?.(str);
    });
 
    proc.on('close', (code) => {
      if (!hasError && (args.ignoreCode || !code)) {
        res((args.ongoing ? undefined : (args.process?.(response) || response)) as T);
      } else {
        rej(error || response);
      }
    });
  });

  return promise;
}