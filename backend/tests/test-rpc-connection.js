#!/usr/bin/env node

import https from 'https';
import http from 'http';
import { URL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.ZCASH_RPC_URL;
const RPC_USER = process.env.ZCASH_RPC_USER;
const RPC_PASS = process.env.ZCASH_RPC_PASS;

console.log('🔍 Testing Zcash RPC Connection');
console.log('================================');
console.log(`URL: ${RPC_URL}`);
console.log(`User: ${RPC_USER || '(none)'}`);
console.log('');

if (!RPC_URL) {
    console.error('❌ ZCASH_RPC_URL not configured in .env file');
    process.exit(1);
}

async function testRPCConnection() {
    try {
        const url = new URL(RPC_URL);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const postData = JSON.stringify({
            jsonrpc: "2.0",
            method: "getblockchaininfo",
            params: [],
            id: 1
        });

        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname || '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        // Add authentication if provided
        if (RPC_USER && RPC_PASS) {
            const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
            options.headers['Authorization'] = `Basic ${auth}`;
        }

        console.log('📡 Sending RPC request...');
        
        const response = await new Promise((resolve, reject) => {
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ status: res.statusCode, data: parsed });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: data });
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });

        if (response.status === 200 && response.data.result) {
            console.log('✅ RPC Connection Successful!');
            console.log('');
            console.log('📊 Blockchain Info:');
            const info = response.data.result;
            console.log(`   Chain: ${info.chain || 'Unknown'}`);
            console.log(`   Blocks: ${info.blocks || 'Unknown'}`);
            console.log(`   Best Block Hash: ${info.bestblockhash || 'Unknown'}`);
            console.log(`   Verification Progress: ${((info.verificationprogress || 0) * 100).toFixed(2)}%`);
            
            if (info.initialblockdownload) {
                console.log('⏳ Node is still syncing...');
            } else {
                console.log('🎉 Node is fully synced!');
            }
        } else {
            console.log('❌ RPC Connection Failed');
            console.log(`Status: ${response.status}`);
            console.log('Response:', response.data);
        }

    } catch (error) {
        console.log('❌ Connection Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('');
            console.log('💡 Troubleshooting:');
            console.log('   - Check if the RPC server is running');
            console.log('   - Verify the URL and port in .env file');
            console.log('   - For local nodes, ensure they are fully started');
        } else if (error.code === 'ENOTFOUND') {
            console.log('');
            console.log('💡 Troubleshooting:');
            console.log('   - Check the hostname in ZCASH_RPC_URL');
            console.log('   - Verify internet connection for public services');
        }
    }
}

// Test different RPC methods
async function testRPCMethods() {
    const methods = [
        { name: 'getblockcount', params: [] },
        { name: 'getnetworkinfo', params: [] },
        { name: 'getmempoolinfo', params: [] }
    ];

    console.log('');
    console.log('🧪 Testing RPC Methods:');
    console.log('========================');

    for (const method of methods) {
        try {
            const url = new URL(RPC_URL);
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const postData = JSON.stringify({
                jsonrpc: "2.0",
                method: method.name,
                params: method.params,
                id: 1
            });

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname || '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            if (RPC_USER && RPC_PASS) {
                const auth = Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64');
                options.headers['Authorization'] = `Basic ${auth}`;
            }

            const response = await new Promise((resolve, reject) => {
                const req = client.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(data);
                            resolve({ status: res.statusCode, data: parsed });
                        } catch (e) {
                            resolve({ status: res.statusCode, data: data });
                        }
                    });
                });

                req.on('error', reject);
                req.write(postData);
                req.end();
            });

            if (response.status === 200 && response.data.result !== undefined) {
                console.log(`✅ ${method.name}: ${JSON.stringify(response.data.result).substring(0, 100)}...`);
            } else {
                console.log(`❌ ${method.name}: Failed`);
            }

        } catch (error) {
            console.log(`❌ ${method.name}: ${error.message}`);
        }
    }
}

// Run tests
testRPCConnection().then(() => {
    return testRPCMethods();
}).catch(console.error);