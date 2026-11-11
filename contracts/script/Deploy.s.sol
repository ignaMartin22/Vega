// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {VegaRegistry} from "../src/VegaRegistry.sol";

/// forge script script/Deploy.s.sol --rpc-url fuji --private-key $PRIVATE_KEY --broadcast
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        VegaRegistry reg = new VegaRegistry();
        // Umbrales iniciales (NDWI × 10_000). Deben coincidir con sample-data/wetlands.geojson
        reg.setThreshold(1, 1500);
        reg.setThreshold(2, 1000);
        reg.setThreshold(3, 1200);
        vm.stopBroadcast();
        console.log("VegaRegistry:", address(reg));
    }
}
