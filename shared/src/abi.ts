/**
 * ABI de VegaRegistry (formato human-readable de ethers v6).
 * Debe coincidir con contracts/src/IVegaRegistry.sol. Cambios -> avisar a los 4.
 */
export const VEGA_REGISTRY_ABI = [
  "function recordMeasurement(uint32 wetlandId, int32 ndwi, string sceneId, bytes32 dataHash, uint64 timestamp)",
  "function setThreshold(uint32 wetlandId, int32 threshold)",
  "function setPublisher(address publisher, bool allowed)",
  "function getMeasurements(uint32 wetlandId) view returns (tuple(uint32 wetlandId, int32 ndwi, string sceneId, bytes32 dataHash, uint64 timestamp)[])",
  "function thresholds(uint32 wetlandId) view returns (int32)",
  "function publishers(address) view returns (bool)",
  "function isRecorded(bytes32 dataHash) view returns (bool)",
  "event MeasurementRecorded(uint32 indexed wetlandId, int32 ndwi, string sceneId, bytes32 dataHash, uint64 timestamp)",
  "event WaterAlert(uint32 indexed wetlandId, int32 ndwi, int32 threshold, uint64 timestamp)",
] as const;
