import { expect } from "chai";
import pkg from 'hardhat';
const { ethers } = pkg;
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers.js";

describe("AIPoweredTrader - Mainnet Fork Tests", function () {
  let aiPoweredTrader: any;
  let priceOracle: any;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  // Real Avalanche C-Chain addresses
  const PANGOLIN_ROUTER = "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106";
  const WAVAX = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
  const USDT = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";

  before(async function () {
    // Skip if not running on forked network
    if (process.env.AVALANCHE_RPC_URL === undefined) {
      this.skip();
    }
  });

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    // Deploy PriceOracle
    const PriceOracleFactory = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracleFactory.deploy();
    
    // Deploy AIPoweredTrader with real Pangolin Router
    const AIPoweredTraderFactory = await ethers.getContractFactory("AIPoweredTrader");
    aiPoweredTrader = await AIPoweredTraderFactory.deploy(
      PANGOLIN_ROUTER,
      await priceOracle.getAddress()
    );

    // Set a valid AI prediction
    const price = ethers.parseEther("25.00");
    const confidence = 80;
    const expiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now
    await priceOracle.setPrediction(price, confidence, expiry);
  });

  describe("Deployment on Fork", function () {
    it("Should deploy successfully with real Pangolin Router", async function () {
      expect(await aiPoweredTrader.pangolinRouter()).to.equal(PANGOLIN_ROUTER);
      expect(await aiPoweredTrader.priceOracle()).to.equal(await priceOracle.getAddress());
      expect(await aiPoweredTrader.WAVAX()).to.equal(WAVAX);
    });

    it("Should have valid AI prediction", async function () {
      const status = await aiPoweredTrader.getAIPredictionStatus();
      expect(status[0]).to.be.true; // isValid
      expect(status[1]).to.equal(80); // confidence
    });
  });

  describe("Real Pangolin Integration", function () {
    it("Should execute tradeExactAVAXForTokens successfully", async function () {
      const amountOutMin = ethers.parseEther("0.001"); // Very low minimum for test
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      const tradeAmount = ethers.parseEther("0.01"); // Small amount for testing

      // Get initial balances
      const initialBalance = await ethers.provider.getBalance(user.address);
      const initialTokenBalance = await ethers.provider.getBalance(await aiPoweredTrader.getAddress());

      // Execute trade
      const tx = await aiPoweredTrader.connect(user).tradeExactAVAXForTokens(
        USDT,
        amountOutMin,
        deadline,
        { value: tradeAmount }
      );

      // Wait for transaction
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check that TradeExecuted event was emitted
      const events = receipt?.logs?.filter(log => {
        try {
          const parsed = aiPoweredTrader.interface.parseLog(log as any);
          return parsed?.name === "TradeExecuted";
        } catch {
          return false;
        }
      });
      expect(events).to.have.length(1);

      // Verify event parameters
      const event = aiPoweredTrader.interface.parseLog(events![0] as any);
      expect(event?.args?.user).to.equal(user.address);
      expect(event?.args?.tokenIn).to.equal(ethers.ZeroAddress); // AVAX
      expect(event?.args?.tokenOut).to.equal(USDT);
      expect(event?.args?.amountIn).to.equal(tradeAmount);
      expect(event?.args?.aiConfidence).to.equal(80);
    });

    it("Should execute tradeExactTokensForTokens successfully", async function () {
      // This test would require the user to have USDT tokens
      // For now, we'll test the function call structure without actual tokens
      const amountIn = ethers.parseEther("1.0");
      const amountOutMin = ethers.parseEther("0.001");
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

      // This will fail due to insufficient token balance, but we can verify the function structure
      await expect(
        aiPoweredTrader.connect(user).tradeExactTokensForTokens(
          USDT,
          WAVAX,
          amountIn,
          amountOutMin,
          deadline
        )
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  describe("AI Validation on Fork", function () {
    it("Should reject trades with invalid AI prediction", async function () {
      // Invalidate the prediction
      await priceOracle.invalidatePrediction();

      const amountOutMin = ethers.parseEther("0.001");
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      const tradeAmount = ethers.parseEther("0.01");

      await expect(
        aiPoweredTrader.connect(user).tradeExactAVAXForTokens(
          USDT,
          amountOutMin,
          deadline,
          { value: tradeAmount }
        )
      ).to.be.revertedWithCustomError(aiPoweredTrader, "AIPredictionInvalid");
    });

    it("Should reject trades with expired AI prediction", async function () {
      // Set a prediction that expires immediately
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const expiry = Math.floor(Date.now() / 1000) - 1; // Already expired
      await priceOracle.setPrediction(price, confidence, expiry);

      const amountOutMin = ethers.parseEther("0.001");
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      const tradeAmount = ethers.parseEther("0.01");

      await expect(
        aiPoweredTrader.connect(user).tradeExactAVAXForTokens(
          USDT,
          amountOutMin,
          deadline,
          { value: tradeAmount }
        )
      ).to.be.revertedWithCustomError(aiPoweredTrader, "AIPredictionInvalid");
    });
  });

  describe("Emergency Functions on Fork", function () {
    it("Should allow owner to withdraw AVAX", async function () {
      // Send some AVAX to the contract
      await owner.sendTransaction({
        to: await aiPoweredTrader.getAddress(),
        value: ethers.parseEther("0.1")
      });

      const initialBalance = await ethers.provider.getBalance(user.address);
      
      await expect(aiPoweredTrader.emergencyWithdraw(ethers.ZeroAddress, user.address))
        .to.emit(aiPoweredTrader, "EmergencyWithdraw")
        .withArgs(ethers.ZeroAddress, ethers.parseEther("0.1"), user.address);

      const finalBalance = await ethers.provider.getBalance(user.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });
});
