// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @dev AI-powered price prediction oracle for validating trading decisions
 * Integrates with off-chain AI models to provide on-chain price predictions
 */
contract PriceOracle is Ownable {
    struct Prediction {
        uint256 price;           // Predicted price in wei
        uint256 confidence;      // Confidence level (0-100)
        uint256 timestamp;       // When prediction was set
        uint256 expiresAt;       // When prediction expires
        bool isValid;            // Whether prediction is currently valid
    }

    // Current prediction
    Prediction public currentPrediction;
    
    // Configuration
    uint256 public minConfidenceThreshold = 70; // 70% minimum confidence (configurable)
    uint256 public constant PREDICTION_EXPIRY_TIME = 1 hours; // 1 hour expiry
    uint256 public constant MAX_CONFIDENCE = 100; // Maximum confidence level

    // Events
    event PredictionSet(
        uint256 indexed price,
        uint256 indexed confidence,
        uint256 timestamp,
        uint256 expiresAt
    );
    
    event PredictionValidated(
        bool isValid,
        uint256 confidence,
        uint256 timestamp
    );
    
    event ConfidenceThresholdUpdated(
        uint256 oldThreshold,
        uint256 newThreshold
    );

    constructor() Ownable() {}

    /**
     * @dev Set a new AI prediction (owner only)
     * @param price Predicted price in wei
     * @param confidence Confidence level (0-100)
     * @param expiresAt When this prediction expires
     */
    function setPrediction(
        uint256 price,
        uint256 confidence,
        uint256 expiresAt
    ) external onlyOwner {
        require(price > 0, "Price must be greater than 0");
        require(confidence <= MAX_CONFIDENCE, "Confidence cannot exceed 100");
        require(expiresAt > block.timestamp, "Expiry must be in the future");
        require(expiresAt <= block.timestamp + PREDICTION_EXPIRY_TIME, "Expiry cannot exceed 1 hour maximum validity");

        currentPrediction = Prediction({
            price: price,
            confidence: confidence,
            timestamp: block.timestamp,
            expiresAt: expiresAt,
            isValid: true
        });

        emit PredictionSet(price, confidence, block.timestamp, expiresAt);
    }

    /**
     * @dev Get the current prediction data
     * @return price Predicted price
     * @return confidence Confidence level
     * @return timestamp When prediction was set
     * @return expiresAt When prediction expires
     * @return isValid Whether prediction is currently valid
     */
    function getPrediction() external view returns (
        uint256 price,
        uint256 confidence,
        uint256 timestamp,
        uint256 expiresAt,
        bool isValid
    ) {
        return (
            currentPrediction.price,
            currentPrediction.confidence,
            currentPrediction.timestamp,
            currentPrediction.expiresAt,
            currentPrediction.isValid
        );
    }

    /**
     * @dev Check if the current prediction is valid
     * @return True if prediction is not expired and meets confidence threshold
     */
    function isPredictionValid() external view returns (bool) {
        return _isPredictionValid();
    }

    /**
     * @dev Check if confidence is above a specific threshold
     * @param minConfidence Minimum confidence threshold
     * @return True if confidence meets or exceeds threshold
     */
    function isConfidenceAboveThreshold(uint256 minConfidence) external view returns (bool) {
        require(minConfidence <= MAX_CONFIDENCE, "Threshold cannot exceed 100");
        return currentPrediction.confidence >= minConfidence;
    }

    /**
     * @dev Invalidate the current prediction (owner only)
     */
    function invalidatePrediction() external onlyOwner {
        currentPrediction.isValid = false;
        emit PredictionValidated(false, currentPrediction.confidence, block.timestamp);
    }

    /**
     * @dev Update confidence threshold (owner only)
     * @param newThreshold New minimum confidence threshold
     */
    function updateConfidenceThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold <= MAX_CONFIDENCE, "Threshold cannot exceed 100");
        uint256 oldThreshold = minConfidenceThreshold;
        minConfidenceThreshold = newThreshold;
        emit ConfidenceThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @dev Internal function to check prediction validity
     */
    function _isPredictionValid() internal view returns (bool) {
        return (
            currentPrediction.isValid &&
            block.timestamp <= currentPrediction.expiresAt &&
            block.timestamp - currentPrediction.timestamp <= PREDICTION_EXPIRY_TIME &&
            currentPrediction.confidence >= minConfidenceThreshold
        );
    }

    /**
     * @dev Get prediction age in seconds
     */
    function getPredictionAge() external view returns (uint256) {
        if (currentPrediction.timestamp == 0) return 0;
        return block.timestamp - currentPrediction.timestamp;
    }

    /**
     * @dev Get time until prediction expires
     */
    function getTimeUntilExpiry() external view returns (uint256) {
        if (currentPrediction.expiresAt == 0 || block.timestamp >= currentPrediction.expiresAt) {
            return 0;
        }
        return currentPrediction.expiresAt - block.timestamp;
    }
}
