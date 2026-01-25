/**
 * File-based data storage system
 * Uses JSON files for persistence instead of MongoDB
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CONTRACTS_FILE = path.join(DATA_DIR, 'contracts.json');
const ANALYSES_FILE = path.join(DATA_DIR, 'analyses.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Generic file operations
async function readJsonFile(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeJsonFile(filePath, defaultValue);
      return defaultValue;
    }
    throw error;
  }
}

async function writeJsonFile(filePath, data) {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// User operations
export class UserStorage {
  static async findAll() {
    return await readJsonFile(USERS_FILE, []);
  }

  static async findById(id) {
    const users = await this.findAll();
    return users.find(user => user.id === id);
  }

  static async findByEmail(email) {
    const users = await this.findAll();
    return users.find(user => user.email === email);
  }

  static async findByApiKey(apiKey) {
    const users = await this.findAll();
    return users.find(user => user.apiKey === apiKey);
  }

  static async create(userData) {
    const users = await this.findAll();
    const newUser = {
      id: crypto.randomUUID(),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(newUser);
    await writeJsonFile(USERS_FILE, users);
    return newUser;
  }

  static async update(id, updates) {
    const users = await this.findAll();
    const userIndex = users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;

    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await writeJsonFile(USERS_FILE, users);
    return users[userIndex];
  }

  static async delete(id) {
    const users = await this.findAll();
    const filteredUsers = users.filter(user => user.id !== id);
    await writeJsonFile(USERS_FILE, filteredUsers);
    return true;
  }
}

// Contract configuration operations
export class ContractStorage {
  static async findAll() {
    return await readJsonFile(CONTRACTS_FILE, []);
  }

  static async findById(id) {
    const contracts = await this.findAll();
    return contracts.find(contract => contract.id === id);
  }

  static async findByUserId(userId, filters = {}) {
    const contracts = await this.findAll();
    let userContracts = contracts.filter(contract => 
      contract.userId === userId && contract.isActive !== false
    );

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      userContracts = userContracts.filter(contract =>
        contract.name.toLowerCase().includes(searchLower) ||
        contract.description?.toLowerCase().includes(searchLower) ||
        contract.targetContract.name.toLowerCase().includes(searchLower)
      );
    }

    if (filters.chain) {
      userContracts = userContracts.filter(contract =>
        contract.targetContract.chain === filters.chain
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      userContracts = userContracts.filter(contract =>
        contract.tags && contract.tags.some(tag => filters.tags.includes(tag))
      );
    }

    return userContracts;
  }

  static async create(contractData) {
    const contracts = await this.findAll();
    const newContract = {
      id: crypto.randomUUID(),
      ...contractData,
      isActive: true,
      lastAnalyzed: null,
      analysisCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    contracts.push(newContract);
    await writeJsonFile(CONTRACTS_FILE, contracts);
    return newContract;
  }

  static async update(id, updates) {
    const contracts = await this.findAll();
    const contractIndex = contracts.findIndex(contract => contract.id === id);
    if (contractIndex === -1) return null;

    contracts[contractIndex] = {
      ...contracts[contractIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await writeJsonFile(CONTRACTS_FILE, contracts);
    return contracts[contractIndex];
  }

  static async delete(id) {
    const contracts = await this.findAll();
    const contractIndex = contracts.findIndex(contract => contract.id === id);
    if (contractIndex === -1) return null;

    contracts[contractIndex].isActive = false;
    contracts[contractIndex].updatedAt = new Date().toISOString();
    await writeJsonFile(CONTRACTS_FILE, contracts);
    return true;
  }

  static async countByUserId(userId) {
    const contracts = await this.findByUserId(userId);
    return contracts.length;
  }
}

// Analysis results operations
export class AnalysisStorage {
  static async findAll() {
    return await readJsonFile(ANALYSES_FILE, []);
  }

  static async findById(id) {
    const analyses = await this.findAll();
    return analyses.find(analysis => analysis.id === id);
  }

  static async findByUserId(userId, filters = {}) {
    const analyses = await this.findAll();
    let userAnalyses = analyses.filter(analysis => analysis.userId === userId);

    // Apply filters
    if (filters.status) {
      userAnalyses = userAnalyses.filter(analysis => analysis.status === filters.status);
    }

    if (filters.analysisType) {
      userAnalyses = userAnalyses.filter(analysis => analysis.analysisType === filters.analysisType);
    }

    // Sort by creation date (newest first)
    userAnalyses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return userAnalyses;
  }

  static async create(analysisData) {
    const analyses = await this.findAll();
    const newAnalysis = {
      id: crypto.randomUUID(),
      ...analysisData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    analyses.push(newAnalysis);
    await writeJsonFile(ANALYSES_FILE, analyses);
    return newAnalysis;
  }

  static async update(id, updates) {
    const analyses = await this.findAll();
    const analysisIndex = analyses.findIndex(analysis => analysis.id === id);
    if (analysisIndex === -1) return null;

    analyses[analysisIndex] = {
      ...analyses[analysisIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await writeJsonFile(ANALYSES_FILE, analyses);
    return analyses[analysisIndex];
  }

  static async getStats(userId) {
    const analyses = await this.findByUserId(userId);
    
    const stats = {
      total: analyses.length,
      completed: analyses.filter(a => a.status === 'completed').length,
      failed: analyses.filter(a => a.status === 'failed').length,
      pending: analyses.filter(a => ['pending', 'running'].includes(a.status)).length,
      avgExecutionTime: 0
    };

    // Calculate average execution time
    const completedAnalyses = analyses.filter(a => a.status === 'completed' && a.metadata?.executionTimeMs);
    if (completedAnalyses.length > 0) {
      const totalTime = completedAnalyses.reduce((sum, a) => sum + a.metadata.executionTimeMs, 0);
      stats.avgExecutionTime = totalTime / completedAnalyses.length;
    }

    return stats;
  }

  static async getMonthlyCount(userId, monthStart) {
    const analyses = await this.findByUserId(userId);
    return analyses.filter(analysis => 
      new Date(analysis.createdAt) >= monthStart
    ).length;
  }
}

// Initialize storage
export async function initializeStorage() {
  try {
    await ensureDataDir();
    console.log('✅ File storage initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ File storage initialization failed:', error.message);
    throw error;
  }
}

export default {
  UserStorage,
  ContractStorage,
  AnalysisStorage,
  initialize: initializeStorage
};