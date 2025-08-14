import { ethers } from "hardhat";
import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentInfo {
  network: string;
  contracts: {
    [key: string]: {
      address: string;
      transactionHash: string;
      blockNumber: number;
      constructorArgs: any[];
    };
  };
  deployedAt: string;
}

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 43113n ? "fuji" : "avalanche";
  
  console.log("Verifying contracts on network:", networkName);
  
  // Read deployment info
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  if (!fs.existsSync(deploymentsPath)) {
    console.error("deployments.json not found. Please deploy contracts first.");
    process.exit(1);
  }
  
  const allDeployments: { [key: string]: DeploymentInfo } = JSON.parse(
    fs.readFileSync(deploymentsPath, "utf8")
  );
  
  const deployment = allDeployments[networkName];
  if (!deployment) {
    console.error(`No deployment found for network: ${networkName}`);
    process.exit(1);
  }
  
  console.log("Found deployment info:", deployment);
  
  // Check if Snowtrace API key is provided
  const snowtraceApiKey = process.env.SNOWTRACE_API_KEY;
  if (!snowtraceApiKey || snowtraceApiKey === "not_required") {
    console.error("SNOWTRACE_API_KEY not provided. Please set it in your .env file.");
    process.exit(1);
  }
  
  // Verify PriceOracle
  console.log("\nVerifying PriceOracle...");
  try {
    await hre.run("verify:verify", {
      address: deployment.contracts.PriceOracle.address,
      constructorArguments: deployment.contracts.PriceOracle.constructorArgs
    });
    console.log("✓ PriceOracle verified successfully");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✓ PriceOracle already verified");
    } else {
      console.error("✗ PriceOracle verification failed:", error.message);
    }
  }
  
  // Verify AIPoweredTrader
  console.log("\nVerifying AIPoweredTrader...");
  try {
    await hre.run("verify:verify", {
      address: deployment.contracts.AIPoweredTrader.address,
      constructorArguments: deployment.contracts.AIPoweredTrader.constructorArgs
    });
    console.log("✓ AIPoweredTrader verified successfully");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("✓ AIPoweredTrader already verified");
    } else {
      console.error("✗ AIPoweredTrader verification failed:", error.message);
    }
  }
  
  console.log("\nVerification process completed!");
  console.log("Check Snowtrace for verification status:");
  if (networkName === "fuji") {
    console.log(`PriceOracle: https://testnet.snowtrace.io/address/${deployment.contracts.PriceOracle.address}`);
    console.log(`AIPoweredTrader: https://testnet.snowtrace.io/address/${deployment.contracts.AIPoweredTrader.address}`);
  } else {
    console.log(`PriceOracle: https://snowtrace.io/address/${deployment.contracts.PriceOracle.address}`);
    console.log(`AIPoweredTrader: https://snowtrace.io/address/${deployment.contracts.AIPoweredTrader.address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
