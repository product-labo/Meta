Script ran successfully.

== Logs ==
  ===========================================
  PRE-DEPLOYMENT CHECKS
  ===========================================
  Deployer: 0x64a5128Fd2a9B63c1052D1960C66c335A430D809
  Deployer Balance: 900000000000000 wei
  Chain ID: 4202
  Payment Mode: token

 WARNING: Low deployer balance!
    Current: 900000000000000 wei
    Recommended: At least 0.001 ETH
    Deployment may fail due to insufficient gas funds
  ===========================================

  ===========================================
  GAS COST ESTIMATION
  ===========================================

Current Gas Price: 1000253 wei
  Current Gas Price: 0 gwei

MetaGaugeToken Deployment:
    Estimated Gas: 750000
    Estimated Cost: 0 ETH

MetaGaugeSubscription Deployment:
    Estimated Gas: 2700000
    Estimated Cost: 0 ETH

--- TOTAL ESTIMATED COST ---
  Total Gas: 3450000
  Total Cost: 3450872850000 wei
  Total Cost: 0 ETH

Recommended Balance (with 20% buffer):
     4141047420000 wei
     0 ETH

Deployer Balance Check:
    Current: 900000000000000 wei
    Required: 4141047420000 wei

 SUFFICIENT BALANCE
    Excess: 895858952580000 wei
    Excess: 0 ETH
  ===========================================

  NOTE: Gas estimates are approximate.
  Actual gas usage may vary based on:
    - Network congestion
    - Contract complexity
    - Constructor arguments
    - Current blockchain state


  Deploying MetaGaugeToken...
   SUCCESS: MetaGaugeToken deployed at: 0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D

Deploying MetaGaugeSubscription (Token Mode)...
   SUCCESS: MetaGaugeSubscription deployed at: 0x577d9A43D0fa564886379bdD9A56285769683C38
  ===========================================
  Deployment Complete!
  ===========================================
  MetaGaugeToken: 0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D
  MetaGaugeSubscription: 0x577d9A43D0fa564886379bdD9A56285769683C38
  Owner: 0x64a5128Fd2a9B63c1052D1960C66c335A430D809
  ===========================================

===========================================
  DEPLOYMENT VALIDATION
  ===========================================

[Token Validation]
    Token Name: MetaGaugeToken
    Token Symbol: MGT
    Total Supply: 300000000 MGT
   PASS: Initial supply correct
    Max Supply: 500000000 MGT
   PASS: Max supply correct
    Token Owner: 0x64a5128Fd2a9B63c1052D1960C66c335A430D809
   PASS: Owner is deployer
    Deployer Balance: 300000000 MGT
   PASS: Initial supply minted to deployer

[Subscription Validation]
    Subscription Owner: 0x64a5128Fd2a9B63c1052D1960C66c335A430D809
   PASS: Owner is deployer
    Paused: false
   PASS: Contract is not paused
    Token Payment Mode: true
    Expected: true
   PASS: Payment mode matches configuration
    Configured Token: 0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D
    Expected Token: 0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D
    PASS: Token address configured correctly

  [Subscription Tier Validation]
      Tier 0 : Free
        Monthly Price: 0
        Yearly Price: 0
        Active: true
         PASS: Tier initialized and active
      Tier 1 : Starter
        Monthly Price: 0
        Yearly Price: 0
        Active: true
         PASS: Tier initialized and active
      Tier 2 : Pro
        Monthly Price: 0
        Yearly Price: 0
        Active: true
         PASS: Tier initialized and active
      Tier 3 : Enterprise
        Monthly Price: 0
        Yearly Price: 1
        Active: true
         PASS: Tier initialized and active

  Total Subscribers: 0

===========================================
   ALL VALIDATIONS PASSED
  ===========================================


===========================================
  CONTRACT VERIFICATION
  ===========================================

[MetaGaugeToken Verification]
    Address: 0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D
    Constructor Args: None
    Status: Will be verified by Foundry --verify flag

[MetaGaugeSubscription Verification]
    Address: 0x577d9A43D0fa564886379bdD9A56285769683C38
    Constructor Args:
      _tokenAddress: 0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D
      _useToken: true
    Status: Will be verified by Foundry --verify flag

===========================================
  VERIFICATION SUMMARY
  ===========================================
  Foundry will automatically verify contracts when using:
    --verify flag
    --verifier blockscout
    --verifier-url <explorer-api-url>

For Lisk Sepolia:
    https://sepolia-blockscout.lisk.com/api

For Lisk Mainnet:
    https://blockscout.lisk.com/api
  ===========================================


===========================================
  GENERATING DEPLOYMENT ARTIFACTS
  ===========================================

Network: lisk-sepolia
  Saving artifacts to: deployments/ lisk-sepolia /
   Saved: deployments/lisk-sepolia/addresses.json
   Saved: deployments/lisk-sepolia/deployment-summary.md

===========================================
   ARTIFACTS GENERATED SUCCESSFULLY
  ===========================================


## Setting up 1 EVM.
==========================
Simulated On-chain Traces:

  [719091] → new MetaGaugeToken@0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D
    ├─ emit OwnershipTransferred(previousOwner: 0x0000000000000000000000000000000000000000, newOwner: 0x64a5128Fd2a9B63c1052D1960C66c335A430D809)
    ├─ emit Transfer(from: 0x0000000000000000000000000000000000000000, to: 0x64a5128Fd2a9B63c1052D1960C66c335A430D809, value: 300000000000000000000000000 [3e26])
    └─ ← [Return] 3018 bytes of code

  [2837121] → new MetaGaugeSubscription@0x577d9A43D0fa564886379bdD9A56285769683C38
    ├─ emit OwnershipTransferred(previousOwner: 0x0000000000000000000000000000000000000000, newOwner: 0x64a5128Fd2a9B63c1052D1960C66c335A430D809)
    ├─ emit OwnershipTransferred(previousOwner: 0x64a5128Fd2a9B63c1052D1960C66c335A430D809, newOwner: 0x64a5128Fd2a9B63c1052D1960C66c335A430D809)
    └─ ← [Return] 9101 bytes of code


==========================

Chain 4202

Estimated gas price: 0.001000506 gwei

Estimated total gas used for script: 5097520

Estimated amount required: 0.00000510009934512 ETH

==========================

##### 4202
✅  [Success] Hash: 0xccd1b563a9b7b38087f9b980b795bf767e8c609cf09ec6f811a2fdd777a5500b
Contract Address: 0x577d9A43D0fa564886379bdD9A56285769683C38
Block: 29559852
Paid: 0.000003084869274517 ETH (3084089 gas * 0.001000253 gwei)


##### 4202
✅  [Success] Hash: 0x7eee618f88b2802d06c5c2288fddb2bc7833d81bc0925b862c3d5b2cfe5cba0c
Contract Address: 0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D
Block: 29559852
Paid: 0.000000837292781493 ETH (837081 gas * 0.001000253 gwei)

✅ Sequence #1 on 4202 | Total Paid: 0.00000392216205601 ETH (3921170 gas * avg 0.001000253 gwei)


==========================

ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.
##
Start verification for (2) contracts
Warning: Found unknown `fuzz_runs` config for profile `default` defined in foundry.toml.
Warning: Found unknown `fuzz_runs` config for profile `default` defined in foundry.toml.
Start verifying contract `0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D` deployed on 4202
EVM version: prague
Compiler version: 0.8.30
Optimizations:    200
Warning: Found unknown `fuzz_runs` config for profile `default` defined in foundry.toml.

Submitting verification for [src/MetaGaugeToken.sol:MetaGaugeToken] 0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D.
Submitted contract for verification:
        Response: `OK`
        GUID: `b51623f59ff9f2aa7d3bc1afa99ae0fa8049ed3d692b1b4b`
        URL: https://sepolia-blockscout.lisk.com/address/0xb51623f59ff9f2aa7d3bc1afa99ae0fa8049ed3d
Warning: Found unknown `fuzz_runs` config for profile `default` defined in foundry.toml.
Contract verification status:
Response: `OK`
Details: `Pending in queue`
Warning: Verification is still pending...; waiting 15 seconds before trying again (7 tries remaining)
Contract verification status:
Response: `OK`
Details: `Pass - Verified`
Contract successfully verified
Warning: Found unknown `fuzz_runs` config for profile `default` defined in foundry.toml.
Warning: Found unknown `fuzz_runs` config for profile `default` defined in foundry.toml.
Start verifying contract `0x577d9A43D0fa564886379bdD9A56285769683C38` deployed on 4202
EVM version: prague
Compiler version: 0.8.30
Optimizations:    200
Constructor args: 000000000000000000000000b51623f59ff9f2aa7d3bc1afa99ae0fa8049ed3d0000000000000000000000000000000000000000000000000000000000000001
Warning: Found unknown `fuzz_runs` config for profile `default` defined in foundry.toml.

Submitting verification for [src/MetaGaugeSubscription.sol:MetaGaugeSubscription] 0x577d9A43D0fa564886379bdD9A56285769683C38.
Submitted contract for verification:
        Response: `OK`
        GUID: `577d9a43d0fa564886379bdd9a56285769683c38692b1b62`
        URL: https://sepolia-blockscout.lisk.com/address/0x577d9a43d0fa564886379bdd9a56285769683c38
Warning: Found unknown `fuzz_runs` config for profile `default` defined in foundry.toml.
Contract verification status:
Response: `OK`
Details: `Pending in queue`
Warning: Verification is still pending...; waiting 15 seconds before trying again (7 tries remaining)
Contract verification status:
Response: `OK`
Details: `Pass - Verified`
Contract successfully verified
All (2) contracts were verified!

Transactions saved to: /mnt/c/pr0/smartmetaguage/smartmetaguage/broadcast/DeployMetaGauge.s.sol/4202/run-latest.json

Sensitive values saved to: /mnt/c/pr0/smartmetaguage/smartmetaguage/cache/DeployMetaGauge.s.sol/4202/run-latest.json


==========================================
✅ Deployment Successful!
==========================================
📝 Check the output above for contract addresses
🔍 View on Explorer: https://sepolia-blockscout.lisk.com
==========================================
david_love@DESKTOP-DO79NUS:/mnt/c/pr0/smartmetaguage/smartmetaguage$