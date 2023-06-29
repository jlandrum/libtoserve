import { spawn } from "child_process";

export const noop = ()=>{}

export const execParams = {
  env: {...process.env, PATH: process.env.PATH+':/opt/homebrew/bin:/usr/local/bin' }
}

export interface ExecuteArgs {
  // The arguments to pass
  args?: string[];
  // Params to pass to spawn
  params?: any;
  
  // If true, the promise will resolve even if a non-zero error code is returned
  ignoreCode?: boolean;
  // If true, the data will be streamed but not captured, and the promise will return undefined
  noCapture?: boolean;

  // Captures the data from the process' STDOUT
  onData?: (data: string) => void;
  // Captures the data from the process' STDERR
  onError?: (data: string) => void;
}

/**
 * A utility class that mimics a promise but allows a cancel handler to be specified.
 * onCancel should be called and if otherwise unhandled, should resolve the promise.
 */
export class CancellablePromise<T> {
  task: Promise<T | any>;
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

  public then(onfulfilled?: ((value?: T | any) => T | PromiseLike<T> | null | undefined | void), onrejected?: ((reason?: any) => PromiseLike<never>) | null | undefined) {
    this.task = this.task.then(onfulfilled, onrejected);
    return this;
  }

  public catch(onrejected?: ((reason?: any) => PromiseLike<never> | null | undefined | void)) {
    this.task.catch(onrejected);
    return this;
  }

  public finally(onfinally?: (() => void) | null | undefined) {
    this.task.finally(onfinally);
    return this;
  }
}

/**
 * 
 * @param command The command to run
 * @param args A configuration object that describes how to run the process
 * @returns A CancellablePromise in which the cancel method will send a SIGTERM to the process.
 */
export function execute<T = string,>(command: string,
                            args: ExecuteArgs): CancellablePromise<T> {
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
      if (!args.noCapture) {
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
        res((args.noCapture ? undefined : (response || error)) as T);
      } else {
        rej(error || response);
      }
    });
  });

  return promise;
}