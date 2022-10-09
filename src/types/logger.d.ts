export interface LoggerOptions {
  meta: () => Record<any, any>;
  persistHandler: (logs: any[]) => void;
  postHandler: (logs: any[]) => void;
  syncInterval?: number;
}