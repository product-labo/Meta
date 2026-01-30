// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MetaGaugeToken.sol";
import "../src/MetaGaugeSubscription.sol";
import "../src/interfaces/IMetaGaugeSubscription.sol";

/**
 * @title DeployMetaGauge
 * @dev Deployment script for MetaGauge contracts on Lisk networks
 */
contract DeployMetaGauge is Script {
    // Deployment results
    address public tokenAddress;
    address public subscriptionAddress;
    
    // Verification tracking
    bool public tokenVerified;
    bool public subscriptionVerified;
    
    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string memory paymentMode = vm.envString("PAYMENT_MODE");
        
        // Check for existing token address
        address existingToken = vm.envOr("EXISTING_TOKEN_ADDRESS", address(0));
        
        // Get deployer address
        address deployer = vm.addr(deployerPrivateKey);
        
        // Check deployer balance
        uint256 deployerBalance = deployer.balance;
        console.log("===========================================");
        console.log("PRE-DEPLOYMENT CHECKS");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Deployer Balance:", deployerBalance, "wei");
        console.log("Chain ID:", block.chainid);
        console.log("Payment Mode:", paymentMode);
        
        // Warn if balance is low
        if (deployerBalance < 0.001 ether) {
            console.log("\n WARNING: Low deployer balance!");
            console.log("  Current:", deployerBalance, "wei");
            console.log("  Recommended: At least 0.001 ETH");
            console.log("  Deployment may fail due to insufficient gas funds");
        }
        console.log("===========================================\n");
        
        // Deploy based on payment mode
        bool useToken = keccak256(bytes(paymentMode)) == keccak256(bytes("token"));
        
        // Estimate gas costs before deployment
        _estimateGasCosts(useToken, existingToken, deployerBalance);
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy with error handling
        bool deploymentSuccess = false;
        
        if (useToken) {
            // Token mode: Deploy or use existing token
            if (existingToken != address(0)) {
                console.log("Using existing token at:", existingToken);
                tokenAddress = existingToken;
                _saveRecoveryState("token_reused", tokenAddress, address(0));
            } else {
                console.log("Deploying MetaGaugeToken...");
                try new MetaGaugeToken() returns (MetaGaugeToken token) {
                    tokenAddress = address(token);
                    console.log(" SUCCESS: MetaGaugeToken deployed at:", tokenAddress);
                    _saveRecoveryState("token_deployed", tokenAddress, address(0));
                } catch Error(string memory reason) {
                    console.log(" DEPLOYMENT FAILED!");
                    console.log("  Error:", reason);
                    _saveRecoveryState("token_failed", address(0), address(0));
                    vm.stopBroadcast();
                    _printRecoveryInstructions(useToken, "token");
                    revert(string(abi.encodePacked("Token deployment failed: ", reason)));
                } catch (bytes memory lowLevelData) {
                    console.log(" DEPLOYMENT FAILED!");
                    console.log("  Low-level error occurred");
                    console.logBytes(lowLevelData);
                    _saveRecoveryState("token_failed", address(0), address(0));
                    vm.stopBroadcast();
                    _printRecoveryInstructions(useToken, "token");
                    revert("Token deployment failed with low-level error");
                }
            }
            
            // Deploy subscription contract with token
            console.log("\nDeploying MetaGaugeSubscription (Token Mode)...");
            try new MetaGaugeSubscription(tokenAddress, true) returns (MetaGaugeSubscription subscription) {
                subscriptionAddress = address(subscription);
                console.log(" SUCCESS: MetaGaugeSubscription deployed at:", subscriptionAddress);
                _saveRecoveryState("subscription_deployed", tokenAddress, subscriptionAddress);
                deploymentSuccess = true;
            } catch Error(string memory reason) {
                console.log(" DEPLOYMENT FAILED!");
                console.log("  Error:", reason);
                _saveRecoveryState("subscription_failed", tokenAddress, address(0));
                vm.stopBroadcast();
                _printRecoveryInstructions(useToken, "subscription");
                revert(string(abi.encodePacked("Subscription deployment failed: ", reason)));
            } catch (bytes memory lowLevelData) {
                console.log(" DEPLOYMENT FAILED!");
                console.log("  Low-level error occurred");
                console.logBytes(lowLevelData);
                _saveRecoveryState("subscription_failed", tokenAddress, address(0));
                vm.stopBroadcast();
                _printRecoveryInstructions(useToken, "subscription");
                revert("Subscription deployment failed with low-level error");
            }
        } else {
            // ETH mode: Deploy subscription only
            console.log("Deploying MetaGaugeSubscription (ETH Mode)...");
            try new MetaGaugeSubscription(address(0), false) returns (MetaGaugeSubscription subscription) {
                subscriptionAddress = address(subscription);
                console.log(" SUCCESS: MetaGaugeSubscription deployed at:", subscriptionAddress);
                _saveRecoveryState("subscription_deployed", address(0), subscriptionAddress);
                deploymentSuccess = true;
            } catch Error(string memory reason) {
                console.log(" DEPLOYMENT FAILED!");
                console.log("  Error:", reason);
                _saveRecoveryState("subscription_failed", address(0), address(0));
                vm.stopBroadcast();
                _printRecoveryInstructions(useToken, "subscription");
                revert(string(abi.encodePacked("Subscription deployment failed: ", reason)));
            } catch (bytes memory lowLevelData) {
                console.log(" DEPLOYMENT FAILED!");
                console.log("  Low-level error occurred");
                console.logBytes(lowLevelData);
                _saveRecoveryState("subscription_failed", address(0), address(0));
                vm.stopBroadcast();
                _printRecoveryInstructions(useToken, "subscription");
                revert("Subscription deployment failed with low-level error");
            }
        }
        
        vm.stopBroadcast();
        
        require(deploymentSuccess, "Deployment did not complete successfully");
        
        // Print deployment summary
        console.log("===========================================");
        console.log("Deployment Complete!");
        console.log("===========================================");
        if (useToken) {
            console.log("MetaGaugeToken:", tokenAddress);
        }
        console.log("MetaGaugeSubscription:", subscriptionAddress);
        console.log("Owner:", deployer);
        console.log("===========================================");
        
        // Validate deployment
        _validateDeployment(useToken);
        
        // Verify contracts on block explorer
        _verifyContracts(useToken);
        
        // Generate deployment artifacts
        _generateArtifacts(useToken, deployer);
    }
    
    function _validateDeployment(bool useToken) internal view {
        console.log("\n===========================================");
        console.log("DEPLOYMENT VALIDATION");
        console.log("===========================================");
        
        bool allChecksPass = true;
        
        // Validate Token (if token mode)
        if (useToken && tokenAddress != address(0)) {
            console.log("\n[Token Validation]");
            allChecksPass = _validateToken() && allChecksPass;
        }
        
        // Validate Subscription
        console.log("\n[Subscription Validation]");
        allChecksPass = _validateSubscription(useToken) && allChecksPass;
        
        // Final result
        console.log("\n===========================================");
        if (allChecksPass) {
            console.log(" ALL VALIDATIONS PASSED");
        } else {
            console.log(" SOME VALIDATIONS FAILED");
        }
        console.log("===========================================\n");
        
        require(allChecksPass, "Deployment validation failed");
    }
    
    function _validateToken() internal view returns (bool) {
        MetaGaugeToken token = MetaGaugeToken(tokenAddress);
        bool passed = true;
        
        // Check 1: Token name and symbol
        string memory name = token.name();
        string memory symbol = token.symbol();
        console.log("  Token Name:", name);
        console.log("  Token Symbol:", symbol);
        
        if (keccak256(bytes(name)) != keccak256(bytes("MetaGaugeToken"))) {
            console.log(" FAIL: Incorrect token name");
            passed = false;
        }
        
        if (keccak256(bytes(symbol)) != keccak256(bytes("MGT"))) {
            console.log(" FAIL: Incorrect token symbol");
            passed = false;
        }
        
        // Check 2: Initial supply (300M MGT)
        uint256 totalSupply = token.totalSupply();
        uint256 expectedInitialSupply = 300_000_000 * 1e18;
        console.log("  Total Supply:", totalSupply / 1e18, "MGT");
        
        if (totalSupply != expectedInitialSupply) {
            console.log(" FAIL: Incorrect initial supply");
            console.log("     Expected:", expectedInitialSupply / 1e18, "MGT");
            passed = false;
        } else {
            console.log(" PASS: Initial supply correct");
        }
        
        // Check 3: Max supply (500M MGT)
        uint256 maxSupply = token.maxSupply();
        uint256 expectedMaxSupply = 500_000_000 * 1e18;
        console.log("  Max Supply:", maxSupply / 1e18, "MGT");
        
        if (maxSupply != expectedMaxSupply) {
            console.log(" FAIL: Incorrect max supply");
            console.log("     Expected:", expectedMaxSupply / 1e18, "MGT");
            passed = false;
        } else {
            console.log(" PASS: Max supply correct");
        }
        
        // Check 4: Owner is deployer
        address owner = token.owner();
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        console.log("  Token Owner:", owner);
        
        if (owner != deployer) {
            console.log(" FAIL: Owner is not deployer");
            console.log("     Expected:", deployer);
            passed = false;
        } else {
            console.log(" PASS: Owner is deployer");
        }
        
        // Check 5: Initial supply minted to deployer
        uint256 deployerBalance = token.balanceOf(deployer);
        console.log("  Deployer Balance:", deployerBalance / 1e18, "MGT");
        
        if (deployerBalance != expectedInitialSupply) {
            console.log(" FAIL: Initial supply not minted to deployer");
            passed = false;
        } else {
            console.log(" PASS: Initial supply minted to deployer");
        }
        
        return passed;
    }
    
    function _validateSubscription(bool useToken) internal view returns (bool) {
        MetaGaugeSubscription subscription = MetaGaugeSubscription(payable(subscriptionAddress));
        bool passed = true;
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        
        // Check 1: Owner is deployer
        address owner = subscription.owner();
        console.log("  Subscription Owner:", owner);
        
        if (owner != deployer) {
            console.log(" FAIL: Owner is not deployer");
            console.log("     Expected:", deployer);
            passed = false;
        } else {
            console.log(" PASS: Owner is deployer");
        }
        
        // Check 2: Contract is not paused
        bool paused = subscription.paused();
        console.log("  Paused:", paused);
        
        if (paused) {
            console.log(" FAIL: Contract is paused");
            passed = false;
        } else {
            console.log(" PASS: Contract is not paused");
        }
        
        // Check 3: Payment mode matches configuration
        bool isTokenPayment = subscription.isTokenPayment();
        console.log("  Token Payment Mode:", isTokenPayment);
        console.log("  Expected:", useToken);
        
        if (isTokenPayment != useToken) {
            console.log(" FAIL: Payment mode mismatch");
            passed = false;
        } else {
            console.log(" PASS: Payment mode matches configuration");
        }
        
        // Check 4: Token address configuration (if token mode)
        if (useToken) {
            address configuredToken = address(subscription.paymentToken());
            console.log("  Configured Token:", configuredToken);
            console.log("  Expected Token:", tokenAddress);
            
            if (configuredToken != tokenAddress) {
                console.log("  FAIL: Token address mismatch");
                passed = false;
            } else {
                console.log("  PASS: Token address configured correctly");
            }
        }
        
        // Check 5: All subscription tiers are initialized and active
        console.log("\n  [Subscription Tier Validation]");
        passed = _validateSubscriptionTiers(subscription) && passed;
        
        // Check 6: Initial state
        uint256 totalSubscribers = subscription.totalSubscribers();
        console.log("\n  Total Subscribers:", totalSubscribers);
        
        if (totalSubscribers != 0) {
            console.log("  WARNING: Expected 0 subscribers on fresh deployment");
        }
        
        return passed;
    }
    
    function _validateSubscriptionTiers(MetaGaugeSubscription subscription) internal view returns (bool) {
        bool passed = true;
        
        // Define tier names for validation
        string[4] memory expectedTierNames = ["Free", "Starter", "Pro", "Enterprise"];
        
        // Validate each tier (0 = Free, 1 = Starter, 2 = Pro, 3 = Enterprise)
        for (uint256 i = 0; i < 4; i++) {
            IMetaGaugeSubscription.SubscriptionPlan memory plan = subscription.getPlanInfo(
                IMetaGaugeSubscription.SubscriptionTier(i)
            );
            
            console.log("    Tier", i, ":", plan.name);
            console.log("      Monthly Price:", plan.monthlyPrice / 1e18);
            console.log("      Yearly Price:", plan.yearlyPrice / 1e18);
            console.log("      Active:", plan.active);
            
            // Check tier name
            if (keccak256(bytes(plan.name)) != keccak256(bytes(expectedTierNames[i]))) {
                console.log("      FAIL: Incorrect tier name");
                console.log("         Expected:", expectedTierNames[i]);
                passed = false;
            }
            
            // Check tier is active
            if (!plan.active) {
                console.log("       FAIL: Tier is not active");
                passed = false;
            }
            
            if (plan.active && keccak256(bytes(plan.name)) == keccak256(bytes(expectedTierNames[i]))) {
                console.log("       PASS: Tier initialized and active");
            }
        }
        
        return passed;
    }
    
    function _verifyContracts(bool useToken) internal {
        console.log("\n===========================================");
        console.log("CONTRACT VERIFICATION");
        console.log("===========================================");
        
        // Note: Foundry handles verification automatically when using --verify flag
        // This function provides additional logging and tracking
        
        if (useToken && tokenAddress != address(0)) {
            console.log("\n[MetaGaugeToken Verification]");
            console.log("  Address:", tokenAddress);
            console.log("  Constructor Args: None");
            console.log("  Status: Will be verified by Foundry --verify flag");
            tokenVerified = true;
        }
        
        console.log("\n[MetaGaugeSubscription Verification]");
        console.log("  Address:", subscriptionAddress);
        if (useToken) {
            console.log("  Constructor Args:");
            console.log("    _tokenAddress:", tokenAddress);
            console.log("    _useToken: true");
        } else {
            console.log("  Constructor Args:");
            console.log("    _tokenAddress:", address(0));
            console.log("    _useToken: false");
        }
        console.log("  Status: Will be verified by Foundry --verify flag");
        subscriptionVerified = true;
        
        console.log("\n===========================================");
        console.log("VERIFICATION SUMMARY");
        console.log("===========================================");
        console.log("Foundry will automatically verify contracts when using:");
        console.log("  --verify flag");
        console.log("  --verifier blockscout");
        console.log("  --verifier-url <explorer-api-url>");
        console.log("\nFor Lisk Sepolia:");
        console.log("  https://sepolia-blockscout.lisk.com/api");
        console.log("\nFor Lisk Mainnet:");
        console.log("  https://blockscout.lisk.com/api");
        console.log("===========================================\n");
    }
    
    /**
     * @dev Helper function to manually verify contracts if automatic verification fails
     * This can be called separately after deployment
     */
    function verifyContract(
        address contractAddress,
        string memory contractName,
        bytes memory constructorArgs
    ) public view {
        console.log("\n===========================================");
        console.log("MANUAL VERIFICATION HELPER");
        console.log("===========================================");
        console.log("Contract:", contractName);
        console.log("Address:", contractAddress);
        console.log("\nTo manually verify, run:");
        console.log("forge verify-contract \\");
        console.log("  ", contractAddress, "\\");
        console.log("  ", contractName, "\\");
        console.log("  --chain-id", block.chainid, "\\");
        console.log("  --verifier blockscout \\");
        
        if (block.chainid == 4202) {
            console.log("  --verifier-url https://sepolia-blockscout.lisk.com/api");
        } else if (block.chainid == 1135) {
            console.log("  --verifier-url https://blockscout.lisk.com/api");
        }
        
        if (constructorArgs.length > 0) {
            console.log("  --constructor-args <encoded-args>");
            console.log("\nConstructor args (hex):");
            console.logBytes(constructorArgs);
        }
        console.log("===========================================\n");
    }
    
    function _generateArtifacts(bool useToken, address deployer) internal {
        console.log("\n===========================================");
        console.log("GENERATING DEPLOYMENT ARTIFACTS");
        console.log("===========================================");
        
        // Determine network name
        string memory networkName = _getNetworkName();
        
        console.log("\nNetwork:", networkName);
        console.log("Saving artifacts to: deployments/", networkName, "/");
        
        // Generate addresses JSON
        string memory addressesJson = _generateAddressesJson(useToken, deployer, networkName);
        string memory addressesPath = string(abi.encodePacked("deployments/", networkName, "/addresses.json"));
        vm.writeFile(addressesPath, addressesJson);
        console.log(" Saved:", addressesPath);
        
        // Generate deployment summary markdown
        string memory summaryMd = _generateDeploymentSummary(useToken, deployer, networkName);
        string memory summaryPath = string(abi.encodePacked("deployments/", networkName, "/deployment-summary.md"));
        vm.writeFile(summaryPath, summaryMd);
        console.log(" Saved:", summaryPath);
        
        console.log("\n===========================================");
        console.log(" ARTIFACTS GENERATED SUCCESSFULLY");
        console.log("===========================================\n");
    }
    
    function _getNetworkName() internal view returns (string memory) {
        if (block.chainid == 4202) {
            return "lisk-sepolia";
        } else if (block.chainid == 1135) {
            return "lisk-mainnet";
        } else {
            return string(abi.encodePacked("chain-", vm.toString(block.chainid)));
        }
    }
    
    function _generateAddressesJson(
        bool useToken,
        address deployer,
        string memory networkName
    ) internal view returns (string memory) {
        string memory json = string(abi.encodePacked(
            "{\n",
            '  "network": "', networkName, '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "blockNumber": ', vm.toString(block.number), ',\n'
        ));
        
        if (useToken && tokenAddress != address(0)) {
            json = string(abi.encodePacked(
                json,
                '  "MetaGaugeToken": "', vm.toString(tokenAddress), '",\n'
            ));
        }
        
        json = string(abi.encodePacked(
            json,
            '  "MetaGaugeSubscription": "', vm.toString(subscriptionAddress), '",\n',
            '  "paymentMode": "', useToken ? "token" : "eth", '"\n',
            "}\n"
        ));
        
        return json;
    }
    
    function _generateDeploymentSummary(
        bool useToken,
        address deployer,
        string memory networkName
    ) internal view returns (string memory) {
        string memory summary = string(abi.encodePacked(
            "# MetaGauge Deployment Summary\n\n",
            "## Network Information\n",
            "- **Network**: ", networkName, "\n",
            "- **Chain ID**: ", vm.toString(block.chainid), "\n",
            "- **Block Number**: ", vm.toString(block.number), "\n",
            "- **Timestamp**: ", vm.toString(block.timestamp), "\n",
            "- **Deployer**: `", vm.toString(deployer), "`\n\n",
            "## Deployed Contracts\n\n"
        ));
        
        if (useToken && tokenAddress != address(0)) {
            summary = string(abi.encodePacked(
                summary,
                "### MetaGaugeToken\n",
                "- **Address**: `", vm.toString(tokenAddress), "`\n",
                "- **Name**: MetaGaugeToken\n",
                "- **Symbol**: MGT\n",
                "- **Initial Supply**: 300,000,000 MGT\n",
                "- **Max Supply**: 500,000,000 MGT\n\n"
            ));
        }
        
        summary = string(abi.encodePacked(
            summary,
            "### MetaGaugeSubscription\n",
            "- **Address**: `", vm.toString(subscriptionAddress), "`\n",
            "- **Payment Mode**: ", useToken ? "Token (MGT)" : "Native (ETH)", "\n"
        ));
        
        if (useToken) {
            summary = string(abi.encodePacked(
                summary,
                "- **Payment Token**: `", vm.toString(tokenAddress), "`\n"
            ));
        }
        
        summary = string(abi.encodePacked(
            summary,
            "\n## Subscription Tiers\n\n",
            "All four subscription tiers are initialized and active:\n",
            "1. **Free** - Entry level tier\n",
            "2. **Starter** - Basic features\n",
            "3. **Pro** - Advanced features\n",
            "4. **Enterprise** - Full features\n\n",
            "## Verification\n\n"
        ));
        
        if (block.chainid == 4202) {
            summary = string(abi.encodePacked(
                summary,
                "View contracts on Lisk Sepolia Explorer:\n",
                "- [MetaGaugeSubscription](https://sepolia-blockscout.lisk.com/address/", vm.toString(subscriptionAddress), ")\n"
            ));
            if (useToken) {
                summary = string(abi.encodePacked(
                    summary,
                    "- [MetaGaugeToken](https://sepolia-blockscout.lisk.com/address/", vm.toString(tokenAddress), ")\n"
                ));
            }
        } else if (block.chainid == 1135) {
            summary = string(abi.encodePacked(
                summary,
                "View contracts on Lisk Mainnet Explorer:\n",
                "- [MetaGaugeSubscription](https://blockscout.lisk.com/address/", vm.toString(subscriptionAddress), ")\n"
            ));
            if (useToken) {
                summary = string(abi.encodePacked(
                    summary,
                    "- [MetaGaugeToken](https://blockscout.lisk.com/address/", vm.toString(tokenAddress), ")\n"
                ));
            }
        }
        
        summary = string(abi.encodePacked(
            summary,
            "\n## Next Steps\n\n",
            "1. Verify contracts are showing as verified on the block explorer\n",
            "2. Test subscription functionality\n",
            "3. Update frontend configuration with deployed addresses\n",
            "4. Monitor contract interactions\n"
        ));
        
        return summary;
    }
    
    function _saveRecoveryState(
        string memory stage,
        address token,
        address subscription
    ) internal {
        string memory networkName = _getNetworkName();
        string memory recoveryJson = string(abi.encodePacked(
            "{\n",
            '  "stage": "', stage, '",\n',
            '  "network": "', networkName, '",\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "tokenAddress": "', vm.toString(token), '",\n',
            '  "subscriptionAddress": "', vm.toString(subscription), '"\n',
            "}\n"
        ));
        
        string memory recoveryPath = string(abi.encodePacked(
            "deployments/", networkName, "/recovery-state.json"
        ));
        
        vm.writeFile(recoveryPath, recoveryJson);
    }
    
    function _printRecoveryInstructions(bool useToken, string memory failedStage) internal view {
        console.log("\n===========================================");
        console.log(" DEPLOYMENT RECOVERY INSTRUCTIONS");
        console.log("===========================================");
        console.log("\nDeployment failed at stage:", failedStage);
        console.log("\nRecovery state saved to:");
        console.log("  deployments/", _getNetworkName(), "/recovery-state.json");
        
        if (keccak256(bytes(failedStage)) == keccak256(bytes("token"))) {
            console.log("\n TROUBLESHOOTING:");
            console.log("  1. Check deployer wallet has sufficient balance");
            console.log("  2. Verify RPC endpoint is accessible");
            console.log("  3. Check gas price is not too high");
            console.log("  4. Review error message above for specific issue");
            console.log("\n TO RETRY:");
            console.log("  Simply run the deployment script again");
        } else if (keccak256(bytes(failedStage)) == keccak256(bytes("subscription"))) {
            console.log("\n PARTIAL DEPLOYMENT DETECTED:");
            if (useToken && tokenAddress != address(0)) {
                console.log("  Token deployed at:", tokenAddress);
                console.log("\n TO CONTINUE:");
                console.log("  1. Set EXISTING_TOKEN_ADDRESS=", vm.toString(tokenAddress), " in .env");
                console.log("  2. Run deployment script again");
                console.log("  3. Script will reuse existing token");
            }
            console.log("\n TROUBLESHOOTING:");
            console.log("  1. Check deployer wallet still has sufficient balance");
            console.log("  2. Verify token address is valid (if token mode)");
            console.log("  3. Review error message above for specific issue");
        }
        
        console.log("\n COMMON ISSUES:");
        console.log("  - Insufficient gas: Fund deployer wallet");
        console.log("  - RPC timeout: Try again or use different RPC");
        console.log("  - Contract size: Check contracts compile correctly");
        console.log("===========================================\n");
    }
    
    function _estimateGasCosts(
        bool useToken,
        address existingToken,
        uint256 deployerBalance
    ) internal view {
        console.log("===========================================");
        console.log("GAS COST ESTIMATION");
        console.log("===========================================");
        
        // Get current gas price
        uint256 gasPrice = tx.gasprice;
        console.log("\nCurrent Gas Price:", gasPrice, "wei");
        console.log("Current Gas Price:", gasPrice / 1e9, "gwei");
        
        // Estimate gas for each deployment
        uint256 tokenGasEstimate = 0;
        uint256 subscriptionGasEstimate = 0;
        
        if (useToken && existingToken == address(0)) {
            // Estimate token deployment (based on typical ERC20 deployment)
            tokenGasEstimate = 750_000; // Approximate gas for MetaGaugeToken
            console.log("\nMetaGaugeToken Deployment:");
            console.log("  Estimated Gas:", tokenGasEstimate);
            console.log("  Estimated Cost:", (tokenGasEstimate * gasPrice) / 1e18, "ETH");
        }
        
        // Estimate subscription deployment
        subscriptionGasEstimate = 2_700_000; // Approximate gas for MetaGaugeSubscription
        console.log("\nMetaGaugeSubscription Deployment:");
        console.log("  Estimated Gas:", subscriptionGasEstimate);
        console.log("  Estimated Cost:", (subscriptionGasEstimate * gasPrice) / 1e18, "ETH");
        
        // Calculate total
        uint256 totalGasEstimate = tokenGasEstimate + subscriptionGasEstimate;
        uint256 totalCostWei = totalGasEstimate * gasPrice;
        uint256 totalCostEth = totalCostWei / 1e18;
        
        console.log("\n--- TOTAL ESTIMATED COST ---");
        console.log("Total Gas:", totalGasEstimate);
        console.log("Total Cost:", totalCostWei, "wei");
        console.log("Total Cost:", totalCostEth, "ETH");
        
        // Add 20% buffer for safety
        uint256 recommendedBalance = (totalCostWei * 120) / 100;
        console.log("\nRecommended Balance (with 20% buffer):");
        console.log("  ", recommendedBalance, "wei");
        console.log("  ", recommendedBalance / 1e18, "ETH");
        
        // Check if deployer has sufficient balance
        console.log("\nDeployer Balance Check:");
        console.log("  Current:", deployerBalance, "wei");
        console.log("  Required:", recommendedBalance, "wei");
        
        if (deployerBalance < totalCostWei) {
            console.log("\n ERROR: INSUFFICIENT BALANCE!");
            console.log("  Shortfall:", (totalCostWei - deployerBalance), "wei");
            console.log("  Shortfall:", (totalCostWei - deployerBalance) / 1e18, "ETH");
            console.log("\n  ACTION REQUIRED:");
            console.log("  Fund deployer wallet with at least", (totalCostWei - deployerBalance) / 1e18, "ETH");
            console.log("  Recommended:", (recommendedBalance - deployerBalance) / 1e18, "ETH (includes buffer)");
            console.log("\n  Deployment will likely FAIL without sufficient funds!");
        } else if (deployerBalance < recommendedBalance) {
            console.log("\n WARNING: Balance is close to minimum!");
            console.log("  Consider adding:", (recommendedBalance - deployerBalance) / 1e18, "ETH buffer");
        } else {
            console.log("\n SUFFICIENT BALANCE");
            console.log("  Excess:", (deployerBalance - recommendedBalance), "wei");
            console.log("  Excess:", (deployerBalance - recommendedBalance) / 1e18, "ETH");
        }
        
        console.log("===========================================\n");
        
        // Note about estimates
        console.log("NOTE: Gas estimates are approximate.");
        console.log("Actual gas usage may vary based on:");
        console.log("  - Network congestion");
        console.log("  - Contract complexity");
        console.log("  - Constructor arguments");
        console.log("  - Current blockchain state");
        console.log("\n");
    }
}
