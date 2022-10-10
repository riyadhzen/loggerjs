/**
 * A sample async function (to demo Typescript's es7 async/await down-leveling).
 *
 * ### Example (es imports)
 * ```js
 * import { asyncABC } from 'typescript-starter'
 * console.log(await asyncABC())
 * // => ['a','b','c']
 * ```
 *
 * ### Example (commonjs)
 * ```js
 * var double = require('typescript-starter').asyncABC;
 * asyncABC().then(console.log);
 * // => ['a','b','c']
 * ```
 *
 * @returns a Promise which should contain `['a','b','c']`
 */

import Timeout from 'await-timeout';
import throttle from './throttle';

enum LogLevel {
  Info = 'INFO',
}
interface LoggerOptions {
  meta: () => Record<any, any>;
  persistHandler: (logs: any[]) => void;
  postHandler: (logs: any[]) => void;
  syncInterval?: number;
};

export default class Logger {
  private logs: any[];
  private isSyncing: boolean;
  private readonly meta: () => Record<any, any> = () => ({});
  private readonly persistLogs: (logs: any[]) => void = () => { };
  private readonly postHandler: (logs: any[]) => void = () => { };
  private LOG_SYNC_INTERVAL = 5000;

  // A throttled sync. Can't be invoked more than once in LOG_SYNC_INTERVAL ms
  private readonly sync: any;

  constructor(options: LoggerOptions) {
    const { meta, persistHandler, postHandler, syncInterval } = options;

    this.meta = meta;
    this.persistLogs = persistHandler;
    this.postHandler = postHandler;
    if (syncInterval) {
      this.LOG_SYNC_INTERVAL = syncInterval;
    }
    this.logs = [];
    this.isSyncing = false;

    // Throttled sync
    this.sync = throttle(this._sync, this.LOG_SYNC_INTERVAL, {
      leading: true,
    });

    // Always try to sync in case we have messages in our
    // logs queue
    setInterval(this.sync.bind(this), this.LOG_SYNC_INTERVAL);
  }

  info(msg: string, data: any = {}) {
    const meta = this.meta();
    try {
      this.store({
        level: LogLevel.Info,
        //  message: `${dayjs(meta.timestamp).toISOString()} INFO : ${msg}`,
        message: `${new Date().toISOString()} INFO : ${msg}`,
        ...data,
        ...meta,
      });
    } catch (error) {
      // Putting it in setTimeout because we don't block
      // app execution because of logging
      setTimeout(() => {
        throw new Error(`Error while info logging ${error}`);
      });
    }
  }

  /**
   * Sotres a log and persists it to localstorage.
   * Note that logs are not saved while this class is syncing
   * It will attempt to save it for 10 seconds before throwing an error
   */
  async store(log: any) {
    // Make sure we don't log while syncing so that we don't
    // clear logs that weren't synced.
    // So, let's retry 10 times (10 seconds) before throwing an error
    // so that people spot this on Sentry
    const maxRetries = 10;
    let count = 0;
    while (this.isSyncing && count < maxRetries) {
      count++;
      await Timeout.set(1000);
    }

    // Still syncing after 10 retries, something is wrong.
    // This error should be picked up by Sentry;
    if (count === maxRetries) {
      throw new Error(`No logs sync after ${count} retries ${log}`);
    }
    // push log to array
    this.logs.push(log);
    // save array in localStorage
    this.persistLogs(this.logs);
    // try to sync
    this.sync();
  }

  /**
   * Emptys logs and clears localstorage
   */
  clear() {
    // empty array
    this.logs = [];
    // clear local storage
    this.persistLogs(this.logs);
  }

  logsCount() {
    return this.logs.length;
  }

  async _sync() {
    // if we are already syncing skip
    if (this.isSyncing || !this.logsCount()) {
      return;
    }
    try {
      // indicate we are syning
      this.isSyncing = true;

      // sync
      await this.postHandler(this.logs);

      // clear storage
      this.clear();
    } finally {
      // set we are done with syncing
      this.isSyncing = false;
    }
  }
}
