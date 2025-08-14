import { ethers } from "hardhat";
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
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 43113n ? "fuji" : "avalanche";
  
  console.log("Contract Interaction Script");
  console.log("Network:", networkName);
  console.log("Signer:", signer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "AVAX");
  
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
  
  // Get contract instances
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const AIPoweredTrader = await ethers.getContractFactory("AIPoweredTrader");
  
  const priceOracle = PriceOracle.attach(deployment.contracts.PriceOracle.address);
  const aiPoweredTrader = AIPoweredTrader.attach(deployment.contracts.AIPoweredTrader.address);
  
  console.log("\n=== Contract Addresses ===");
  console.log("PriceOracle:", deployment.contracts.PriceOracle.address);
  console.log("AIPoweredTrader:", deployment.contracts.AIPoweredTrader.address);
  
  // Check if signer is owner of PriceOracle
  const oracleOwner = await priceOracle.owner();
  const isOracleOwner = oracleOwner.toLowerCase() === signer.address.toLowerCase();
  console.log("\nOracle Owner:", oracleOwner);
  console.log("Is Signer Owner:", isOracleOwner);
  
  // Get current prediction
  console.log("\n=== Current Prediction ===");
  try {
    const prediction = await priceOracle.getPrediction();
    console.log("Price:", ethers.formatEther(prediction[0]), "AVAX");
    console.log("Confidence:", prediction[1], "%");
    console.log("Timestamp:", new Date(Number(prediction[2]) * 1000).toISOString());
    console.log("Expires At:", new Date(Number(prediction[3]) * 1000).toISOString());
    console.log("Is Valid:", prediction[4]);
    
    const isValid = await priceOracle.isPredictionValid();
    console.log("Prediction Valid:", isValid);
  } catch (error) {
    console.log("No prediction set or error:", error);
  }
  
  // Set test prediction if owner
  if (isOracleOwner) {
    console.log("\n=== Setting Test Prediction ===");
    try {
      const testPrice = ethers.parseEther("25.50"); // 25.50 AVAX
      const testConfidence = 85; // 85% confidence
      const testExpiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      const tx = await priceOracle.setPrediction(testPrice, testConfidence, testExpiry);
      await tx.wait();
      console.log("✓ Test prediction set successfully");
      console.log("Transaction:", tx.hash);
      
      // Verify the prediction was set
      const newPrediction = await priceOracle.getPrediction();
      console.log("New Price:", ethers.formatEther(newPrediction[0]), "AVAX");
      console.log("New Confidence:", newPrediction[1], "%");
    } catch (error) {
      console.log("Failed to set test prediction:", error);
    }
  }
  
  // Test AI prediction status
  console.log("\n=== AI Prediction Status ===");
  try {
    const aiStatus = await aiPoweredTrader.getAIPredictionStatus();
    console.log("AI Valid:", aiStatus[0]);
    console.log("AI Confidence:", aiStatus[1], "%");
  } catch (error) {
    console.log("Failed to get AI status:", error);
  }
  
  // Test confidence threshold check
  console.log("\n=== Confidence Threshold Tests ===");
  try {
    const thresholds = [50, 70, 80, 90];
    for (const threshold of thresholds) {
      const isAbove = await priceOracle.isConfidenceAboveThreshold(threshold);
      console.log(`${threshold}% threshold:`, isAbove);
    }
  } catch (error) {
    console.log("Failed to check confidence thresholds:", error);
  }
  
  // Get prediction age and expiry info
  console.log("\n=== Prediction Timing ===");
  try {
    const age = await priceOracle.getPredictionAge();
    const timeUntilExpiry = await priceOracle.getTimeUntilExpiry();
    
    console.log("Prediction Age:", age, "seconds");
    console.log("Time Until Expiry:", timeUntilExpiry, "seconds");
    console.log("Age in minutes:", Math.floor(age / 60));
    console.log("Expiry in minutes:", Math.floor(timeUntilExpiry / 60));
  } catch (error) {
    console.log("Failed to get timing info:", error);
  }
  
  // Test contract pause functionality (if owner)
  const traderOwner = await aiPoweredTrader.owner();
  const isTraderOwner = traderOwner.toLowerCase() === signer.address.toLowerCase();
  
  if (isTraderOwner) {
    console.log("\n=== Pause Functionality Test ===");
    try {
      const isPaused = await aiPoweredTrader.paused();
      console.log("Currently Paused:", isPaused);
      
      if (!isPaused) {
        console.log("Pausing contract...");
        const pauseTx = await aiPoweredTrader.pause();
        await pauseTx.wait();
        console.log("✓ Contract paused");
        
        console.log("Unpausing contract...");
        const unpauseTx = await aiPoweredTrader.unpause();
        await unpauseTx.wait();
        console.log("✓ Contract unpaused");
      }
    } catch (error) {
      console.log("Failed to test pause functionality:", error);
    }
  }
  
  console.log("\n=== Interaction Script Completed ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
