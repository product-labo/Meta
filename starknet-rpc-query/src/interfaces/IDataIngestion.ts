export interface IDataIngestion {
  start(): Promise<void>;
  stop(): Promise<void>;
}
