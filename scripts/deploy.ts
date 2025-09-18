import hre from "hardhat";
const { ethers } = hre;
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Network-specific configurations
  const isTestnet = network.chainId === 43113n; // Fuji testnet
  const networkName = isTestnet ? "fuji" : "avalanche";
  
  // Pangolin Router addresses
  const PANGOLIN_ROUTER_ADDRESS = isTestnet 
    ? "0x2D99ABD9008Dc933ff5c0CD271B88309593aB921" // Fuji testnet
    : "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106"; // Avalanche mainnet

  console.log("Using Pangolin Router:", PANGOLIN_ROUTER_ADDRESS);

  // Deploy PriceOracle first
  console.log("\nDeploying PriceOracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  
  console.log("PriceOracle deployed to:", priceOracleAddress);

  // Deploy AIPoweredTrader with PriceOracle and Pangolin Router addresses
  console.log("\nDeploying AIPoweredTrader...");
  const AIPoweredTrader = await ethers.getContractFactory("AIPoweredTrader");
  const aiPoweredTrader = await AIPoweredTrader.deploy(
    PANGOLIN_ROUTER_ADDRESS,
    priceOracleAddress
  );
  await aiPoweredTrader.waitForDeployment();
  const aiPoweredTraderAddress = await aiPoweredTrader.getAddress();
  
  console.log("AIPoweredTrader deployed to:", aiPoweredTraderAddress);

  // Get deployment transaction details
  const priceOracleDeployment = priceOracle.deploymentTransaction();
  const aiPoweredTraderDeployment = aiPoweredTrader.deploymentTransaction();
  
  if (!priceOracleDeployment || !aiPoweredTraderDeployment) {
    throw new Error("Failed to get deployment transactions");
  }

  // Create deployment info
  const deploymentInfo: DeploymentInfo = {
    network: networkName,
    contracts: {
      PriceOracle: {
        address: priceOracleAddress,
        transactionHash: priceOracleDeployment.hash,
        blockNumber: priceOracleDeployment.blockNumber || 0,
        constructorArgs: []
      },
      AIPoweredTrader: {
        address: aiPoweredTraderAddress,
        transactionHash: aiPoweredTraderDeployment.hash,
        blockNumber: aiPoweredTraderDeployment.blockNumber || 0,
        constructorArgs: [PANGOLIN_ROUTER_ADDRESS, priceOracleAddress]
      }
    },
    deployedAt: new Date().toISOString()
  };

  // Save deployment info to file
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  let allDeployments: { [key: string]: DeploymentInfo } = {};
  
  if (fs.existsSync(deploymentsPath)) {
    allDeployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  }
  
  allDeployments[networkName] = deploymentInfo;
  fs.writeFileSync(deploymentsPath, JSON.stringify(allDeployments, null, 2));

  console.log("\nDeployment info saved to deployments.json");

  // Verify contracts on Snowtrace if API key is provided
  const snowtraceApiKey = process.env.SNOWTRACE_API_KEY;
  if (snowtraceApiKey && snowtraceApiKey !== "not_required") {
    console.log("\nVerifying contracts on Snowtrace...");
    
    try {
      // Wait a bit for the contracts to be indexed
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Verify PriceOracle
      console.log("Verifying PriceOracle...");
      await hre.run("verify:verify", {
        address: priceOracleAddress,
        constructorArguments: []
      });
      
      // Verify AIPoweredTrader
      console.log("Verifying AIPoweredTrader...");
      await hre.run("verify:verify", {
        address: aiPoweredTraderAddress,
        constructorArguments: [PANGOLIN_ROUTER_ADDRESS, priceOracleAddress]
      });
      
      console.log("Contracts verified successfully!");
    } catch (error) {
      console.log("Verification failed (contracts may already be verified):", error);
    }
  } else {
    console.log("\nSkipping contract verification (no Snowtrace API key provided)");
  }

  // Validate deployment by calling basic functions
  console.log("\nValidating deployment...");
  
  try {
    // Test PriceOracle functions
    const prediction = await priceOracle.getPrediction();
    console.log("PriceOracle validation: ✓ Prediction retrieval works");
    
    // Test AIPoweredTrader functions
    const aiStatus = await aiPoweredTrader.getAIPredictionStatus();
    console.log("AIPoweredTrader validation: ✓ AI status check works");
    
    console.log("Deployment validation successful!");
  } catch (error) {
    console.log("Deployment validation failed:", error);
  }

  // Copy contract ABIs to frontend
  console.log("\nCopying contract ABIs to frontend...");
  
  const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");
  const frontendAbiDir = path.join(__dirname, "..", "src", "utils", "abis");
  
  // Ensure frontend ABI directory exists
  if (!fs.existsSync(frontendAbiDir)) {
    fs.mkdirSync(frontendAbiDir, { recursive: true });
  }
  
  // Copy PriceOracle ABI
  const priceOracleArtifact = JSON.parse(
    fs.readFileSync(path.join(artifactsDir, "PriceOracle.sol", "PriceOracle.json"), "utf8")
  );
  fs.writeFileSync(
    path.join(frontendAbiDir, "PriceOracle.json"),
    JSON.stringify(priceOracleArtifact, null, 2)
  );
  
  // Copy AIPoweredTrader ABI
  const aiPoweredTraderArtifact = JSON.parse(
    fs.readFileSync(path.join(artifactsDir, "AIPoweredTrader.sol", "AIPoweredTrader.json"), "utf8")
  );
  fs.writeFileSync(
    path.join(frontendAbiDir, "AIPoweredTrader.json"),
    JSON.stringify(aiPoweredTraderArtifact, null, 2)
  );
  
  console.log("Contract ABIs copied to frontend");

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", networkName);
  console.log("PriceOracle:", priceOracleAddress);
  console.log("AIPoweredTrader:", aiPoweredTraderAddress);
  console.log("Pangolin Router:", PANGOLIN_ROUTER_ADDRESS);
  console.log("Deployer:", deployer.address);
  console.log("==========================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
