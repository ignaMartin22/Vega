// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {VegaRegistry} from "../src/VegaRegistry.sol";

/// PUBLISHER=0x... forge script script/Deploy.s.sol --rpc-url fuji --private-key $PRIVATE_KEY --broadcast
contract Deploy is Script {
    function run() external {
        address publisher = vm.envOr("PUBLISHER", address(0));

        vm.startBroadcast();
        VegaRegistry reg = new VegaRegistry();
        // Umbrales iniciales (NDWI × 10_000). Deben coincidir con sample-data/wetlands.geojson
        reg.setThreshold(1, 1500);
        reg.setThreshold(2, 1000);
        reg.setThreshold(3, 1200);
        if (publisher != address(0)) {
            reg.setPublisher(publisher, true);
        }
        vm.stopBroadcast();

        console.log("VegaRegistry:", address(reg));

        if (block.chainid == 43113) {
            string memory key = "deployment";
            vm.serializeAddress(key, "address", address(reg));
            vm.serializeUint(key, "deployBlock", block.number);
            vm.serializeAddress(key, "publisher", publisher != address(0) ? publisher : msg.sender);
            vm.serializeString(key, "deployTx", "");
            string memory json = vm.serializeString(
                key, "note", "Generado por Deploy.s.sol; completar deployTx desde el explorer"
            );
            vm.writeJson(json, "../shared/deployments/fuji.json");
        }
    }
}
