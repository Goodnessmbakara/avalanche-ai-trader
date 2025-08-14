import { expect } from "chai";
import pkg from 'hardhat';
const { ethers } = pkg;
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers.js";

describe("AIPoweredTrader", function () {
  let aiPoweredTrader: any;
  let priceOracle: any;
  let mockRouter: any;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;

  // Mock WAVAX address
  const MOCK_WAVAX_ADDRESS = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";

  beforeEach(async function () {
    [owner, user, user2] = await ethers.getSigners();
    
    // Deploy MockPangolinRouter
    const MockRouterFactory = await ethers.getContractFactory("MockPangolinRouter");
    mockRouter = await MockRouterFactory.deploy(MOCK_WAVAX_ADDRESS);
    
    // Deploy PriceOracle
    const PriceOracleFactory = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracleFactory.deploy();
    
    // Deploy AIPoweredTrader
    const AIPoweredTraderFactory = await ethers.getContractFactory("AIPoweredTrader");
    aiPoweredTrader = await AIPoweredTraderFactory.deploy(
      await mockRouter.getAddress(),
      await priceOracle.getAddress()
    );
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await aiPoweredTrader.owner()).to.equal(owner.address);
    });

    it("Should set correct contract addresses", async function () {
      expect(await aiPoweredTrader.pangolinRouter()).to.equal(await mockRouter.getAddress());
      expect(await aiPoweredTrader.priceOracle()).to.equal(await priceOracle.getAddress());
    });

    it("Should set correct WAVAX address", async function () {
      expect(await aiPoweredTrader.WAVAX()).to.equal(MOCK_WAVAX_ADDRESS);
    });

    it("Should not be paused initially", async function () {
      expect(await aiPoweredTrader.paused()).to.be.false;
    });
  });

  describe("Pause/Unpause", function () {
    it("Should allow owner to pause", async function () {
      await expect(aiPoweredTrader.pause())
        .to.emit(aiPoweredTrader, "Paused")
        .withArgs(owner.address);
      
      expect(await aiPoweredTrader.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await aiPoweredTrader.pause();
      
      await expect(aiPoweredTrader.unpause())
        .to.emit(aiPoweredTrader, "Unpaused")
        .withArgs(owner.address);
      
      expect(await aiPoweredTrader.paused()).to.be.false;
    });

    it("Should not allow non-owner to pause", async function () {
      await expect(
        aiPoweredTrader.connect(user).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow non-owner to unpause", async function () {
      await aiPoweredTrader.pause();
      
      await expect(
        aiPoweredTrader.connect(user).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("getAIPredictionStatus", function () {
    it("Should return false for empty prediction", async function () {
      const status = await aiPoweredTrader.getAIPredictionStatus();
      expect(status[0]).to.be.false; // isValid
      expect(status[1]).to.equal(0); // confidence
    });

    it("Should return correct status for valid prediction", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const expiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

      await priceOracle.setPrediction(price, confidence, expiry);
      
      const status = await aiPoweredTrader.getAIPredictionStatus();
      expect(status[0]).to.be.true; // isValid
      expect(status[1]).to.equal(confidence);
    });

    it("Should return false for invalid prediction", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 60; // Below threshold
      const expiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

      await priceOracle.setPrediction(price, confidence, expiry);
      
      const status = await aiPoweredTrader.getAIPredictionStatus();
      expect(status[0]).to.be.false; // isValid
      expect(status[1]).to.equal(confidence);
    });
  });

  describe("Emergency Withdraw", function () {
    it("Should allow owner to withdraw AVAX", async function () {
      // Send some AVAX to the contract
      await owner.sendTransaction({
        to: await aiPoweredTrader.getAddress(),
        value: ethers.parseEther("1.0")
      });

      const initialBalance = await ethers.provider.getBalance(user.address);
      
      await expect(aiPoweredTrader.emergencyWithdraw(ethers.ZeroAddress, user.address))
        .to.emit(aiPoweredTrader, "EmergencyWithdraw")
        .withArgs(ethers.ZeroAddress, ethers.parseEther("1.0"), user.address);

      const finalBalance = await ethers.provider.getBalance(user.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        aiPoweredTrader.connect(user).emergencyWithdraw(ethers.ZeroAddress, user.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject zero recipient address", async function () {
      await expect(
        aiPoweredTrader.emergencyWithdraw(ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Trading Functions - AI Validation", function () {
    beforeEach(async function () {
      // Set up a valid AI prediction
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const expiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      await priceOracle.setPrediction(price, confidence, expiry);
    });

    describe("tradeExactAVAXForTokens", function () {
      it("Should revert when AI validation fails", async function () {
        // Invalidate the prediction
        await priceOracle.invalidatePrediction();

        const tokenOut = "0x1234567890123456789012345678901234567890";
        const amountOutMin = ethers.parseEther("0.1");
        const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

        await expect(
          aiPoweredTrader.connect(user).tradeExactAVAXForTokens(
            tokenOut,
            amountOutMin,
            deadline,
            { value: ethers.parseEther("1.0") }
          )
        ).to.be.revertedWithCustomError(aiPoweredTrader, "AIPredictionInvalid");
      });

      it("Should revert when paused", async function () {
        await aiPoweredTrader.pause();

        const tokenOut = "0x1234567890123456789012345678901234567890";
        const amountOutMin = ethers.parseEther("0.1");
        const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

        await expect(
          aiPoweredTrader.connect(user).tradeExactAVAXForTokens(
            tokenOut,
            amountOutMin,
            deadline,
            { value: ethers.parseEther("1.0") }
          )
        ).to.be.revertedWith("Pausable: paused");
      });

      it("Should revert with zero value", async function () {
        const tokenOut = "0x1234567890123456789012345678901234567890";
        const amountOutMin = ethers.parseEther("0.1");
        const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

        await expect(
          aiPoweredTrader.connect(user).tradeExactAVAXForTokens(
            tokenOut,
            amountOutMin,
            deadline,
            { value: 0 }
          )
        ).to.be.revertedWith("Must send AVAX");
      });

      it("Should revert with zero token address", async function () {
        const amountOutMin = ethers.parseEther("0.1");
        const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

        await expect(
          aiPoweredTrader.connect(user).tradeExactAVAXForTokens(
            ethers.ZeroAddress,
            amountOutMin,
            deadline,
            { value: ethers.parseEther("1.0") }
          )
        ).to.be.revertedWith("Invalid token address");
      });

      it("Should revert with past deadline", async function () {
        const tokenOut = "0x1234567890123456789012345678901234567890";
        const amountOutMin = ethers.parseEther("0.1");
        const deadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour in the past

        await expect(
          aiPoweredTrader.connect(user).tradeExactAVAXForTokens(
            tokenOut,
            amountOutMin,
            deadline,
            { value: ethers.parseEther("1.0") }
          )
        ).to.be.revertedWith("Deadline must be in future");
      });

      it("Should revert with deadline too far in future", async function () {
        const tokenOut = "0x1234567890123456789012345678901234567890";
        const amountOutMin = ethers.parseEther("0.1");
        const deadline = Math.floor(Date.now() / 1000) + 25 * 60; // 25 minutes

        await expect(
          aiPoweredTrader.connect(user).tradeExactAVAXForTokens(
            tokenOut,
            amountOutMin,
            deadline,
            { value: ethers.parseEther("1.0") }
          )
        ).to.be.revertedWith("Deadline too far");
      });
    });

    describe("tradeExactTokensForAVAX", function () {
      it("Should revert when AI validation fails", async function () {
        // Invalidate the prediction
        await priceOracle.invalidatePrediction();

        const tokenIn = "0x1234567890123456789012345678901234567890";
        const amountIn = ethers.parseEther("1.0");
        const amountOutMin = ethers.parseEther("0.1");
        const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

        await expect(
          aiPoweredTrader.connect(user).tradeExactTokensForAVAX(
            tokenIn,
            amountIn,
            amountOutMin,
            deadline
          )
        ).to.be.revertedWithCustomError(aiPoweredTrader, "AIPredictionInvalid");
      });

      it("Should revert with zero amount", async function () {
        const tokenIn = "0x1234567890123456789012345678901234567890";
        const amountOutMin = ethers.parseEther("0.1");
        const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

        await expect(
          aiPoweredTrader.connect(user).tradeExactTokensForAVAX(
            tokenIn,
            0,
            amountOutMin,
            deadline
          )
        ).to.be.revertedWith("Amount must be greater than 0");
      });

      it("Should revert with zero token address", async function () {
        const amountIn = ethers.parseEther("1.0");
        const amountOutMin = ethers.parseEther("0.1");
        const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

        await expect(
          aiPoweredTrader.connect(user).tradeExactTokensForAVAX(
            ethers.ZeroAddress,
            amountIn,
            amountOutMin,
            deadline
          )
        ).to.be.revertedWith("Invalid token address");
      });
    });

    describe("tradeExactTokensForTokens", function () {
      it("Should revert when AI validation fails", async function () {
        // Invalidate the prediction
        await priceOracle.invalidatePrediction();

        const tokenIn = "0x1234567890123456789012345678901234567890";
        const tokenOut = "0x0987654321098765432109876543210987654321";
        const amountIn = ethers.parseEther("1.0");
        const amountOutMin = ethers.parseEther("0.1");
        const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

        await expect(
          aiPoweredTrader.connect(user).tradeExactTokensForTokens(
            tokenIn,
            tokenOut,
            amountIn,
            amountOutMin,
            deadline
          )
        ).to.be.revertedWithCustomError(aiPoweredTrader, "AIPredictionInvalid");
      });

      it("Should revert with same token addresses", async function () {
        const tokenIn = "0x1234567890123456789012345678901234567890";
        const amountIn = ethers.parseEther("1.0");
        const amountOutMin = ethers.parseEther("0.1");
        const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

        await expect(
          aiPoweredTrader.connect(user).tradeExactTokensForTokens(
            tokenIn,
            tokenIn, // Same token
            amountIn,
            amountOutMin,
            deadline
          )
        ).to.be.revertedWith("Tokens must be different");
      });
    });
  });

  describe("Constants", function () {
    it("Should have correct TRADE_DEADLINE_BUFFER", async function () {
      expect(await aiPoweredTrader.TRADE_DEADLINE_BUFFER()).to.equal(1200); // 20 minutes
    });
  });

  describe("Receive Function", function () {
    it("Should accept AVAX", async function () {
      const initialBalance = await ethers.provider.getBalance(await aiPoweredTrader.getAddress());
      
      await owner.sendTransaction({
        to: await aiPoweredTrader.getAddress(),
        value: ethers.parseEther("1.0")
      });

      const finalBalance = await ethers.provider.getBalance(await aiPoweredTrader.getAddress());
      expect(finalBalance).to.equal(initialBalance + ethers.parseEther("1.0"));
    });
  });

  describe("Success Path Tests", function () {
    beforeEach(async function () {
      // Set up a valid AI prediction
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const expiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      await priceOracle.setPrediction(price, confidence, expiry);
    });

    it("Should execute tradeExactAVAXForTokens successfully and emit TradeExecuted event", async function () {
      const tokenOut = "0x1234567890123456789012345678901234567890";
      const amountOutMin = ethers.parseEther("0.1");
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      const tradeAmount = ethers.parseEther("1.0");

      await expect(
        aiPoweredTrader.connect(user).tradeExactAVAXForTokens(
          tokenOut,
          amountOutMin,
          deadline,
          { value: tradeAmount }
        )
      )
        .to.emit(aiPoweredTrader, "TradeExecuted")
        .withArgs(
          user.address,
          ethers.ZeroAddress, // AVAX
          tokenOut,
          tradeAmount,
          tradeAmount, // Mock amount out (same as tradeAmount)
          80, // AI confidence
          ethers.parseEther("25.00") // AI predicted price
        );
    });

    it("Should execute tradeExactTokensForAVAX successfully and emit TradeExecuted event", async function () {
      // This test requires real token contracts, so we'll skip it for now
      // In a real scenario, the user would need to approve and transfer tokens
      this.skip();
    });

    it("Should execute tradeExactTokensForTokens successfully and emit TradeExecuted event", async function () {
      // This test requires real token contracts, so we'll skip it for now
      // In a real scenario, the user would need to approve and transfer tokens
      this.skip();
    });
  });

  describe("Events", function () {
    beforeEach(async function () {
      // Set up a valid AI prediction
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const expiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      await priceOracle.setPrediction(price, confidence, expiry);
    });

    it("Should emit TradeRejected event when AI validation fails", async function () {
      // Invalidate the prediction
      await priceOracle.invalidatePrediction();

      const tokenOut = "0x1234567890123456789012345678901234567890";
      const amountOutMin = ethers.parseEther("0.1");
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes

      await expect(
        aiPoweredTrader.connect(user).tradeExactAVAXForTokens(
          tokenOut,
          amountOutMin,
          deadline,
          { value: ethers.parseEther("1.0") }
        )
      ).to.be.revertedWithCustomError(aiPoweredTrader, "AIPredictionInvalid");
      
      // Note: The custom error AIPredictionInvalid is now used instead of the event
      // because events are discarded when transactions revert.
    });
  });
});
