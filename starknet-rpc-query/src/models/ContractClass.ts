/**
 * ContractClass model representing contract class definitions and ABI
 */
export interface ContractClass {
  classHash: string;
  abi: any; // JSON ABI definition
  bytecode?: string;
  entryPoints: EntryPoint[];
  createdAt: Date;
}

export interface ContractClassCreateInput {
  classHash: string;
  abi: any;
  bytecode?: string;
  entryPoints: EntryPoint[];
}

export interface EntryPoint {
  selector: string;
  functionName?: string;
  entryPointType: 'external' | 'l1_handler' | 'constructor';
}