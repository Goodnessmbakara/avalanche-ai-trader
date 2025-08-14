import { expect } from "chai";
import pkg from 'hardhat';
const { ethers } = pkg;
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs.js";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers.js";

describe("PriceOracle", function () {
  let priceOracle: any;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user, user2] = await ethers.getSigners();
    
    const PriceOracleFactory = await ethers.getContractFactory("PriceOracle");
    priceOracle = await PriceOracleFactory.deploy();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await priceOracle.owner()).to.equal(owner.address);
    });

    it("Should have correct constants and initial values", async function () {
      expect(await priceOracle.minConfidenceThreshold()).to.equal(70);
      expect(await priceOracle.PREDICTION_EXPIRY_TIME()).to.equal(3600); // 1 hour
      expect(await priceOracle.MAX_CONFIDENCE()).to.equal(100);
    });
  });

  describe("setPrediction", function () {
    const validPrice = ethers.parseEther("25.50");
    const validConfidence = 85;
    const validExpiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now

    it("Should allow owner to set prediction", async function () {
      await expect(priceOracle.setPrediction(validPrice, validConfidence, validExpiry))
        .to.emit(priceOracle, "PredictionSet")
        .withArgs(validPrice, validConfidence, anyValue, validExpiry);

      const prediction = await priceOracle.getPrediction();
      expect(prediction[0]).to.equal(validPrice);
      expect(prediction[1]).to.equal(validConfidence);
      expect(prediction[2]).to.be.gt(0); // timestamp
      expect(prediction[3]).to.equal(validExpiry);
      expect(prediction[4]).to.be.true; // isValid
    });

    it("Should not allow non-owner to set prediction", async function () {
      await expect(
        priceOracle.connect(user).setPrediction(validPrice, validConfidence, validExpiry)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject zero price", async function () {
      await expect(
        priceOracle.setPrediction(0, validConfidence, validExpiry)
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("Should reject confidence above 100", async function () {
      await expect(
        priceOracle.setPrediction(validPrice, 101, validExpiry)
      ).to.be.revertedWith("Confidence cannot exceed 100");
    });

    it("Should reject past expiry", async function () {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      await expect(
        priceOracle.setPrediction(validPrice, validConfidence, pastExpiry)
      ).to.be.revertedWith("Expiry must be in the future");
    });

    it("Should reject expiry more than 1 hour in future", async function () {
      const farExpiry = Math.floor(Date.now() / 1000) + 2 * 3600; // 2 hours
      await expect(
        priceOracle.setPrediction(validPrice, validConfidence, farExpiry)
      ).to.be.revertedWith("Expiry cannot exceed 1 hour maximum validity");
    });

    it("Should allow confidence of 100", async function () {
      await expect(
        priceOracle.setPrediction(validPrice, 100, validExpiry)
      ).to.not.be.reverted;
    });

    it("Should allow confidence of 0", async function () {
      await expect(
        priceOracle.setPrediction(validPrice, 0, validExpiry)
      ).to.not.be.reverted;
    });
  });

  describe("getPrediction", function () {
    it("Should return empty prediction initially", async function () {
      const prediction = await priceOracle.getPrediction();
      expect(prediction[0]).to.equal(0); // price
      expect(prediction[1]).to.equal(0); // confidence
      expect(prediction[2]).to.equal(0); // timestamp
      expect(prediction[3]).to.equal(0); // expiresAt
      expect(prediction[4]).to.be.false; // isValid
    });

    it("Should return correct prediction after setting", async function () {
      const price = ethers.parseEther("30.00");
      const confidence = 90;
      const expiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

      await priceOracle.setPrediction(price, confidence, expiry);
      const prediction = await priceOracle.getPrediction();

      expect(prediction[0]).to.equal(price);
      expect(prediction[1]).to.equal(confidence);
      expect(prediction[2]).to.be.gt(0);
      expect(prediction[3]).to.equal(expiry);
      expect(prediction[4]).to.be.true;
    });
  });

  describe("isPredictionValid", function () {
    it("Should return false for empty prediction", async function () {
      expect(await priceOracle.isPredictionValid()).to.be.false;
    });

    it("Should return true for valid prediction", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 80; // Above 70% threshold
      const expiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

      await priceOracle.setPrediction(price, confidence, expiry);
      expect(await priceOracle.isPredictionValid()).to.be.true;
    });

    it("Should return false for low confidence", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 60; // Below 70% threshold
      const expiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

      await priceOracle.setPrediction(price, confidence, expiry);
      expect(await priceOracle.isPredictionValid()).to.be.false;
    });

    it("Should return false for expired prediction", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const expiry = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now

      await priceOracle.setPrediction(price, confidence, expiry);
      
      // Wait for expiry
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      expect(await priceOracle.isPredictionValid()).to.be.false;
    });

    it("Should return false for old prediction (beyond 1 hour)", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const currentTime = await ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const expiry = currentTime + 3600;

      await priceOracle.setPrediction(price, confidence, expiry);
      
      // Wait more than 1 hour
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      expect(await priceOracle.isPredictionValid()).to.be.false;
    });

    it("Should return false for invalidated prediction", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const currentTime = await ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const expiry = currentTime + 3600;

      await priceOracle.setPrediction(price, confidence, expiry);
      await priceOracle.invalidatePrediction();

      expect(await priceOracle.isPredictionValid()).to.be.false;
    });
  });

  describe("updateConfidenceThreshold", function () {
    it("Should allow owner to update confidence threshold", async function () {
      const newThreshold = 80;
      await expect(priceOracle.updateConfidenceThreshold(newThreshold))
        .to.emit(priceOracle, "ConfidenceThresholdUpdated")
        .withArgs(70, newThreshold);
      
      expect(await priceOracle.minConfidenceThreshold()).to.equal(newThreshold);
    });

    it("Should not allow non-owner to update confidence threshold", async function () {
      await expect(
        priceOracle.connect(user).updateConfidenceThreshold(80)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject threshold above 100", async function () {
      await expect(
        priceOracle.updateConfidenceThreshold(101)
      ).to.be.revertedWith("Threshold cannot exceed 100");
    });

    it("Should allow threshold of 100", async function () {
      await expect(priceOracle.updateConfidenceThreshold(100)).to.not.be.reverted;
      expect(await priceOracle.minConfidenceThreshold()).to.equal(100);
    });

    it("Should allow threshold of 0", async function () {
      await expect(priceOracle.updateConfidenceThreshold(0)).to.not.be.reverted;
      expect(await priceOracle.minConfidenceThreshold()).to.equal(0);
    });

    it("Should affect prediction validity after threshold change", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 75;
      const currentTime = await ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const expiry = currentTime + 3600;

      await priceOracle.setPrediction(price, confidence, expiry);
      expect(await priceOracle.isPredictionValid()).to.be.true; // Above 70% default

      // Increase threshold to 80%
      await priceOracle.updateConfidenceThreshold(80);
      expect(await priceOracle.isPredictionValid()).to.be.false; // Below 80%

      // Decrease threshold to 70%
      await priceOracle.updateConfidenceThreshold(70);
      expect(await priceOracle.isPredictionValid()).to.be.true; // Above 70%
    });
  });

  describe("isConfidenceAboveThreshold", function () {
    beforeEach(async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 75;
      const currentTime = await ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const expiry = currentTime + 3600;
      await priceOracle.setPrediction(price, confidence, expiry);
    });

    it("Should return true for threshold below confidence", async function () {
      expect(await priceOracle.isConfidenceAboveThreshold(70)).to.be.true;
      expect(await priceOracle.isConfidenceAboveThreshold(75)).to.be.true;
    });

    it("Should return false for threshold above confidence", async function () {
      expect(await priceOracle.isConfidenceAboveThreshold(80)).to.be.false;
      expect(await priceOracle.isConfidenceAboveThreshold(100)).to.be.false;
    });

    it("Should return true for threshold equal to confidence", async function () {
      expect(await priceOracle.isConfidenceAboveThreshold(75)).to.be.true;
    });

    it("Should reject threshold above 100", async function () {
      await expect(
        priceOracle.isConfidenceAboveThreshold(101)
      ).to.be.revertedWith("Threshold cannot exceed 100");
    });
  });

  describe("invalidatePrediction", function () {
    it("Should allow owner to invalidate prediction", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const currentTime = await ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const expiry = currentTime + 3600;

      await priceOracle.setPrediction(price, confidence, expiry);
      expect(await priceOracle.isPredictionValid()).to.be.true;

      await expect(priceOracle.invalidatePrediction())
        .to.emit(priceOracle, "PredictionValidated")
        .withArgs(false, confidence, anyValue);

      expect(await priceOracle.isPredictionValid()).to.be.false;
    });

    it("Should not allow non-owner to invalidate prediction", async function () {
      await expect(
        priceOracle.connect(user).invalidatePrediction()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("getPredictionAge", function () {
    it("Should return 0 for empty prediction", async function () {
      expect(await priceOracle.getPredictionAge()).to.equal(0);
    });

    it("Should return correct age for prediction", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const currentTime = await ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const expiry = currentTime + 3600;

      await priceOracle.setPrediction(price, confidence, expiry);
      
      // Wait 5 seconds
      await ethers.provider.send("evm_increaseTime", [5]);
      await ethers.provider.send("evm_mine", []);

      const age = await priceOracle.getPredictionAge();
      expect(age).to.be.gte(5);
    });
  });

  describe("getTimeUntilExpiry", function () {
    it("Should return 0 for empty prediction", async function () {
      expect(await priceOracle.getTimeUntilExpiry()).to.equal(0);
    });

    it("Should return correct time until expiry", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const currentTime = await ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const expiry = currentTime + 3600; // 1 hour

      await priceOracle.setPrediction(price, confidence, expiry);
      
      const timeUntilExpiry = await priceOracle.getTimeUntilExpiry();
      expect(timeUntilExpiry).to.be.gte(3590); // At least 59 minutes 50 seconds
      expect(timeUntilExpiry).to.be.lte(3600); // At most 1 hour
    });

    it("Should return 0 for expired prediction", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const currentTime = await ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const expiry = currentTime + 3600; // 1 hour

      await priceOracle.setPrediction(price, confidence, expiry);
      
      // Wait for expiry
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      expect(await priceOracle.getTimeUntilExpiry()).to.equal(0);
    });
  });

  describe("Events", function () {
    it("Should emit PredictionSet event", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const currentTime = await ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const expiry = currentTime + 3600;

      await expect(priceOracle.setPrediction(price, confidence, expiry))
        .to.emit(priceOracle, "PredictionSet")
        .withArgs(price, confidence, anyValue, expiry);
    });

    it("Should emit PredictionValidated event on invalidation", async function () {
      const price = ethers.parseEther("25.00");
      const confidence = 80;
      const currentTime = await ethers.provider.getBlock("latest").then(block => block!.timestamp);
      const expiry = currentTime + 3600;

      await priceOracle.setPrediction(price, confidence, expiry);
      
      await expect(priceOracle.invalidatePrediction())
        .to.emit(priceOracle, "PredictionValidated")
        .withArgs(false, confidence, anyValue);
    });

    it("Should emit ConfidenceThresholdUpdated event", async function () {
      await expect(priceOracle.updateConfidenceThreshold(80))
        .to.emit(priceOracle, "ConfidenceThresholdUpdated")
        .withArgs(70, 80);
    });
  });
});
