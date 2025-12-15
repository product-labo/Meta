import { ethers } from 'ethers';
import { dbService } from './DbService';

interface DecodedFunction {
    name: string;
    inputs: any[];
    selector: string;
}

interface DecodedEvent {
    name: string;
    inputs: any[];
    signature: string;
}

export class DecoderService {
    private functionSignatures: Map<string, DecodedFunction> = new Map();
    private eventSignatures: Map<string, DecodedEvent> = new Map();

    constructor() {
        this.loadCommonSignatures();
    }

    /**
     * Load common function and event signatures
     */
    private loadCommonSignatures() {
        // Common ERC20 functions
        const erc20Functions = [
            'transfer(address,uint256)',
            'transferFrom(address,address,uint256)',
            'approve(address,uint256)',
            'balanceOf(address)',
            'allowance(address,address)',
        ];

        // Common ERC20 events
        const erc20Events = [
            'Transfer(address,address,uint256)',
            'Approval(address,address,uint256)',
        ];

        // Common DeFi functions
        const defiFunctions = [
            'swap(uint256,uint256,address[],address,uint256)', // Uniswap
            'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
            'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)',
            'mint(uint256)', // Compound
            'redeem(uint256)',
            'borrow(uint256)',
            'repayBorrow(uint256)',
        ];

        // Load function signatures
        [...erc20Functions, ...defiFunctions].forEach(sig => {
            const selector = ethers.id(sig).slice(0, 10);
            const name = sig.split('(')[0];
            this.functionSignatures.set(selector, {
                name,
                inputs: this.parseInputs(sig),
                selector
            });
        });

        // Load event signatures
        erc20Events.forEach(sig => {
            const topic0 = ethers.id(sig);
            const name = sig.split('(')[0];
            this.eventSignatures.set(topic0, {
                name,
                inputs: this.parseInputs(sig),
                signature: sig
            });
        });
    }

    /**
     * Parse function/event inputs from signature
     */
    private parseInputs(signature: string): any[] {
        const match = signature.match(/\((.*)\)/);
        if (!match || !match[1]) return [];
        
        return match[1].split(',').map((type, index) => ({
            type: type.trim(),
            name: `param${index}`,
            indexed: false // Will be set properly for events
        }));
    }

    /**
     * Decode function call data
     */
    async decodeFunction(data: string): Promise<{
        name: string;
        selector: string;
        inputs: any[];
        decoded?: any;
    } | null> {
        if (!data || data.length < 10) return null;

        const selector = data.slice(0, 10);
        let functionInfo = this.functionSignatures.get(selector);

        // If not found, try to fetch from database
        if (!functionInfo) {
            const result = await dbService.query(
                'SELECT * FROM mc_function_signatures WHERE selector = $1',
                [selector]
            );

            if (result.rows.length > 0) {
                const row = result.rows[0];
                functionInfo = {
                    name: row.function_name,
                    inputs: row.inputs,
                    selector: row.selector
                };
                this.functionSignatures.set(selector, functionInfo);
            }
        }

        if (!functionInfo) {
            // Try to fetch from 4byte.directory API
            const fetchedFunction = await this.fetchFunctionSignature(selector);
            if (fetchedFunction) {
                functionInfo = fetchedFunction;
                this.functionSignatures.set(selector, functionInfo);
                // Save to database
                await this.saveFunctionSignature(functionInfo);
            }
        }

        if (!functionInfo) {
            return {
                name: 'unknown',
                selector,
                inputs: []
            };
        }

        // Decode the parameters
        let decoded;
        try {
            const iface = new ethers.Interface([
                `function ${functionInfo.name}(${functionInfo.inputs.map(i => i.type).join(',')})`
            ]);
            decoded = iface.decodeFunctionData(functionInfo.name, data);
        } catch (error) {
            // Silently handle decoding errors - many functions have complex parameters
            decoded = null;
        }

        return {
            name: functionInfo.name,
            selector,
            inputs: functionInfo.inputs,
            decoded: decoded ? Array.from(decoded) : undefined
        };
    }

    /**
     * Decode event log
     */
    async decodeEvent(topics: readonly string[], data: string): Promise<{
        name: string;
        signature: string;
        decoded?: any;
    } | null> {
        if (!topics || topics.length === 0) return null;

        const topic0 = topics[0];
        let eventInfo = this.eventSignatures.get(topic0);

        // If not found, try to fetch from database
        if (!eventInfo) {
            const result = await dbService.query(
                'SELECT * FROM mc_event_signatures WHERE topic0 = $1',
                [topic0]
            );

            if (result.rows.length > 0) {
                const row = result.rows[0];
                eventInfo = {
                    name: row.event_name,
                    inputs: row.inputs,
                    signature: row.signature
                };
                this.eventSignatures.set(topic0, eventInfo);
            }
        }

        if (!eventInfo) {
            return {
                name: 'unknown',
                signature: topic0,
            };
        }

        // Decode the event
        let decoded;
        try {
            const iface = new ethers.Interface([
                `event ${eventInfo.signature}`
            ]);
            decoded = iface.decodeEventLog(eventInfo.name, data, topics);
        } catch (error) {
            // Silently handle decoding errors - many events have complex structures
            // that don't match standard signatures
            decoded = null;
        }

        return {
            name: eventInfo.name,
            signature: eventInfo.signature,
            decoded: decoded ? Object.fromEntries(
                Object.entries(decoded).filter(([key]) => isNaN(Number(key)))
            ) : undefined
        };
    }

    /**
     * Fetch function signature from 4byte.directory
     */
    private async fetchFunctionSignature(selector: string): Promise<DecodedFunction | null> {
        try {
            const response = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const signature = data.results[0].text_signature;
                const name = signature.split('(')[0];
                
                return {
                    name,
                    inputs: this.parseInputs(signature),
                    selector
                };
            }
        } catch (error) {
            console.warn(`Failed to fetch signature for ${selector}:`, error);
        }
        
        return null;
    }

    /**
     * Save function signature to database
     */
    private async saveFunctionSignature(func: DecodedFunction) {
        try {
            await dbService.query(
                `INSERT INTO mc_function_signatures (selector, signature, function_name, inputs, source)
                 VALUES ($1, $2, $3, $4, $5) ON CONFLICT (selector) DO NOTHING`,
                [
                    func.selector,
                    `${func.name}(${func.inputs.map(i => i.type).join(',')})`,
                    func.name,
                    JSON.stringify(func.inputs),
                    '4byte'
                ]
            );
        } catch (error) {
            console.warn('Failed to save function signature:', error);
        }
    }

    /**
     * Detect token transfer from event
     */
    detectTokenTransfer(decodedEvent: any, contractAddress: string): {
        from: string;
        to: string;
        amount: string;
        tokenAddress: string;
    } | null {
        if (decodedEvent.name === 'Transfer' && decodedEvent.decoded) {
            const { from, to, value } = decodedEvent.decoded;
            return {
                from: from || ethers.ZeroAddress,
                to: to || ethers.ZeroAddress,
                amount: value?.toString() || '0',
                tokenAddress: contractAddress
            };
        }
        return null;
    }

    /**
     * Detect DeFi interaction patterns
     */
    detectDefiInteraction(decodedFunction: any, contractAddress: string, userAddress: string): {
        protocol: string;
        type: string;
        metadata: any;
    } | null {
        const funcName = decodedFunction.name.toLowerCase();
        
        // Uniswap patterns
        if (funcName.includes('swap')) {
            return {
                protocol: 'uniswap',
                type: 'swap',
                metadata: {
                    function: decodedFunction.name,
                    contract: contractAddress,
                    user: userAddress,
                    params: decodedFunction.decoded
                }
            };
        }

        // Compound patterns
        if (['mint', 'redeem', 'borrow', 'repayborrow'].includes(funcName)) {
            return {
                protocol: 'compound',
                type: funcName === 'mint' ? 'lend' : funcName,
                metadata: {
                    function: decodedFunction.name,
                    contract: contractAddress,
                    user: userAddress,
                    params: decodedFunction.decoded
                }
            };
        }

        return null;
    }
}

export const decoderService = new DecoderService();