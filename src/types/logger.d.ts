export type LoggerOptions = {
  readonly meta: () => Record<any, any>;
  readonly persistHandler: (logs: readonly any[]) => void;
  readonly postHandler: (logs: readonly any[]) => void;
  readonly syncInterval?: number;
};
