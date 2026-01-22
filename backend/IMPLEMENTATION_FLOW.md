# Backend Implementation Flow

## Overview
Fix critical authentication and wallet management issues in the Lisk Paywall SDK backend.

## Current Issues
1. Missing social login database columns (`google_id`, `github_id`, `avatar_url`)
2. Missing `custodial_wallets` table
3. Database configuration inconsistencies
4. Social login will crash due to missing schema
5. Wallet auto-creation fails during signup

## Implementation Phases

### Phase 1: Database Schema Migration
**Priority: CRITICAL**
**Time: 30 minutes**

#### 1.1 Social Login Schema Update
```sql
-- Add social login columns to users table
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN github_id VARCHAR(255) UNIQUE; 
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Add indexes for performance
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_github_id ON users(github_id);
```

#### 1.2 Custodial Wallets Table Creation
```sql
-- Create custodial wallets table
CREATE TABLE custodial_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL,
    public_key TEXT,
    encrypted_private_key TEXT NOT NULL,
    iv VARCHAR(255) NOT NULL,
    network VARCHAR(50) NOT NULL CHECK (network IN ('lisk', 'starknet', 'zcash')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, project_id, network)
);

-- Add indexes
CREATE INDEX idx_custodial_wallets_user_id ON custodial_wallets(user_id);
CREATE INDEX idx_custodial_wallets_network ON custodial_wallets(network);
CREATE INDEX idx_custodial_wallets_address ON custodial_wallets(address);

-- Add trigger for updated_at
CREATE TRIGGER update_custodial_wallets_updated_at 
    BEFORE UPDATE ON custodial_wallets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Phase 2: Environment Configuration
**Priority: HIGH**
**Time: 15 minutes**

#### 2.1 Standardize Database Configuration
- Ensure all files use same database credentials
- Add missing environment variables
- Validate required variables on startup

#### 2.2 Security Configuration
- Generate proper encryption keys
- Secure JWT secrets
- Configure email service

### Phase 3: Code Fixes
**Priority: HIGH**
**Time: 35 minutes**

#### 3.1 Social Login Error Handling (10 min)
- Add try-catch blocks in `socialLogin` function
- Implement graceful fallbacks
- Add proper validation

#### 3.2 Custodial Wallet Service (15 min)
- Fix table references in `custodyController.ts`
- Add proper error handling
- Implement idempotency checks

#### 3.3 Authentication Flow Improvements (10 min)
- Clarify OTP requirements in responses
- Add resend OTP endpoint
- Improve error messages

### Phase 4: Testing & Validation
**Priority: MEDIUM**
**Time: 40 minutes**

#### 4.1 Database Testing (15 min)
- Test schema migrations
- Verify data integrity
- Test constraints and indexes

#### 4.2 Authentication Testing (15 min)
- Test all signup flows (OTP, password, social)
- Test wallet auto-creation
- Test error scenarios

#### 4.3 Integration Testing (10 min)
- End-to-end user flows
- Multi-chain wallet creation
- API endpoint validation

## Success Criteria
- [ ] Social login works without crashes
- [ ] Custodial wallets auto-create on signup
- [ ] All authentication flows work
- [ ] Database schema is consistent
- [ ] Environment configuration is standardized
- [ ] All tests pass

## Rollback Plan
1. Keep backup of current database schema
2. Document all changes made
3. Create rollback SQL scripts
4. Test rollback procedure

## Post-Implementation
1. Monitor error logs
2. Validate user signup success rates
3. Check wallet creation metrics
4. Update documentation

## Files to Modify
- `schema.sql` (add migrations)
- `src/controllers/authController.ts` (error handling)
- `src/controllers/custodyController.ts` (table references)
- `.env` (configuration)
- Test files (update database config)

## Dependencies
- PostgreSQL database access
- Environment variables configured
- Email service credentials
- Encryption keys generated
