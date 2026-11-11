// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVegaRegistry} from "./IVegaRegistry.sol";

/// @title VegaRegistry
/// @notice Registro inmutable de mediciones NDWI de humedales de la Puna.
/// @dev Responsable: Integrante 1 (Contratos). Base: ThresholdAlert de la guía del track.
contract VegaRegistry is IVegaRegistry {
    /// @notice NDWI mínimo válido (escala × 10_000).
    int32 public constant NDWI_MIN = -10_000;
    /// @notice NDWI máximo válido (escala × 10_000).
    int32 public constant NDWI_MAX = 10_000;

    address public owner;
    mapping(address => bool) public publishers;
    mapping(uint32 => int32) public thresholds;
    /// @notice Indica si el humedal tiene umbral configurado.
    mapping(uint32 => bool) public hasThreshold;
    mapping(bytes32 => bool) public isRecorded;
    mapping(uint32 => Measurement[]) private _measurements;

    /// @notice Se emite al configurar el umbral de un humedal.
    event ThresholdSet(uint32 indexed wetlandId, int32 threshold);
    /// @notice Se emite al habilitar o deshabilitar un publicador.
    event PublisherSet(address indexed publisher, bool allowed);

    /// @notice El llamador no es el owner.
    error NotOwner();
    /// @notice El llamador no es un publicador autorizado.
    error NotPublisher();
    /// @notice Ya existe una medición con ese hash.
    error AlreadyRecorded(bytes32 dataHash);
    /// @notice El NDWI está fuera del rango [NDWI_MIN, NDWI_MAX].
    error InvalidNdwi(int32 ndwi);
    /// @notice El hash de datos es cero.
    error EmptyHash();

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
        emit PublisherSet(msg.sender, true);
    }

    /// @notice Habilita o deshabilita un publicador.
    function setPublisher(address publisher, bool allowed) external onlyOwner {
        publishers[publisher] = allowed;
        emit PublisherSet(publisher, allowed);
    }

    /// @notice Configura el umbral de alerta de un humedal.
    function setThreshold(uint32 wetlandId, int32 threshold) external onlyOwner {
        thresholds[wetlandId] = threshold;
        hasThreshold[wetlandId] = true;
        emit ThresholdSet(wetlandId, threshold);
    }

    /// @notice Registra una medición; emite WaterAlert si el NDWI cae bajo el umbral configurado.
    function recordMeasurement(
        uint32 wetlandId,
        int32 ndwi,
        string calldata sceneId,
        bytes32 dataHash,
        uint64 timestamp
    ) external onlyPublisher {
        if (ndwi < NDWI_MIN || ndwi > NDWI_MAX) revert InvalidNdwi(ndwi);
        if (dataHash == bytes32(0)) revert EmptyHash();
        if (isRecorded[dataHash]) revert AlreadyRecorded(dataHash);
        isRecorded[dataHash] = true;
        _measurements[wetlandId].push(Measurement(wetlandId, ndwi, sceneId, dataHash, timestamp));
        emit MeasurementRecorded(wetlandId, ndwi, sceneId, dataHash, timestamp);

        int32 threshold = thresholds[wetlandId];
        if (hasThreshold[wetlandId] && ndwi < threshold) {
            emit WaterAlert(wetlandId, ndwi, threshold, timestamp);
        }
    }

    /// @notice Devuelve todas las mediciones de un humedal.
    function getMeasurements(uint32 wetlandId) external view returns (Measurement[] memory) {
        return _measurements[wetlandId];
    }
}
