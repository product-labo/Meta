/**
 * Contract model representing deployed smart contracts on Starknet
 */
export interface Contract {
  contractAddress: string;
  classHash: string;
  deployerAddress?: string;
  deploymentTxHash?: string;
  deploymentBlock?: bigint;
  isProxy: boolean;
  createdAt: Date;
}

export interface ContractCreateInput {
  contractAddress: string;
  classHash: string;
  deployerAddress?: string;
  deploymentTxHash?: string;
  deploymentBlock?: bigint;
  isProxy: boolean;
}

export interface ProxyLink {
  proxyAddress: string;
  implementationAddress: string;
  upgradeBlock: bigint;
  upgradeTxHash: string;
  createdAt: Date;
}