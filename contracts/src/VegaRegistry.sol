// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVegaRegistry} from "./IVegaRegistry.sol";

/// @title VegaRegistry
/// @notice Registro inmutable de mediciones NDWI de humedales de la Puna.
/// @dev Esqueleto inicial. Responsable: Integrante 1 (Contratos). Base: ThresholdAlert de la guía del track.
contract VegaRegistry is IVegaRegistry {
    address public owner;
    mapping(address => bool) public publishers;
    mapping(uint32 => int32) public thresholds;
    mapping(bytes32 => bool) public isRecorded;
    mapping(uint32 => Measurement[]) private _measurements;

    error NotOwner();
    error NotPublisher();
    error AlreadyRecorded(bytes32 dataHash);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyPublisher() {
        if (!publishers[msg.sender]) revert NotPublisher();
        _;
    }

    constructor() {
        owner = msg.sender;
        publishers[msg.sender] = true;
    }

    function setPublisher(address publisher, bool allowed) external onlyOwner {
        publishers[publisher] = allowed;
    }

    function setThreshold(uint32 wetlandId, int32 threshold) external onlyOwner {
        thresholds[wetlandId] = threshold;
    }

    function recordMeasurement(
        uint32 wetlandId,
        int32 ndwi,
        string calldata sceneId,
        bytes32 dataHash,
        uint64 timestamp
    ) external onlyPublisher {
        if (isRecorded[dataHash]) revert AlreadyRecorded(dataHash);
        isRecorded[dataHash] = true;
        _measurements[wetlandId].push(Measurement(wetlandId, ndwi, sceneId, dataHash, timestamp));
        emit MeasurementRecorded(wetlandId, ndwi, sceneId, dataHash, timestamp);

        int32 threshold = thresholds[wetlandId];
        // TODO(Contratos): decidir semántica si el umbral no está seteado (hoy 0 => nunca alerta con NDWI >= 0)
        if (ndwi < threshold) {
            emit WaterAlert(wetlandId, ndwi, threshold, timestamp);
        }
    }

    function getMeasurements(uint32 wetlandId) external view returns (Measurement[] memory) {
        return _measurements[wetlandId];
    }
}
