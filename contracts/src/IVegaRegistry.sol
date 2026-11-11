// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IVegaRegistry — INTERFAZ CONGELADA (ver docs/INTERFACES.md)
/// @notice Debe coincidir con shared/src/abi.ts. Cualquier cambio se avisa a los 4.
interface IVegaRegistry {
    struct Measurement {
        uint32 wetlandId;
        int32 ndwi;        // NDWI × 10_000
        string sceneId;    // ID del item STAC de Sentinel-2
        bytes32 dataHash;  // keccak256 del registro canónico off-chain
        uint64 timestamp;  // unix seg. de adquisición de la escena
    }

    event MeasurementRecorded(uint32 indexed wetlandId, int32 ndwi, string sceneId, bytes32 dataHash, uint64 timestamp);
    event WaterAlert(uint32 indexed wetlandId, int32 ndwi, int32 threshold, uint64 timestamp);

    /// @dev Solo publicadores autorizados. Emite WaterAlert si ndwi < threshold del humedal.
    ///      Revierte si dataHash ya fue registrado.
    function recordMeasurement(uint32 wetlandId, int32 ndwi, string calldata sceneId, bytes32 dataHash, uint64 timestamp) external;

    /// @dev Solo owner.
    function setThreshold(uint32 wetlandId, int32 threshold) external;

    /// @dev Solo owner. Allowlist de relayers.
    function setPublisher(address publisher, bool allowed) external;

    function getMeasurements(uint32 wetlandId) external view returns (Measurement[] memory);
    function thresholds(uint32 wetlandId) external view returns (int32);
    function publishers(address publisher) external view returns (bool);
    function isRecorded(bytes32 dataHash) external view returns (bool);
}
