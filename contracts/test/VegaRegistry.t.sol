// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {VegaRegistry} from "../src/VegaRegistry.sol";
import {IVegaRegistry} from "../src/IVegaRegistry.sol";

contract VegaRegistryTest is Test {
    VegaRegistry reg;
    address stranger = address(0xBEEF);

    function setUp() public {
        reg = new VegaRegistry();
        reg.setThreshold(2, 1000); // umbral 0.10
    }

    function test_RecordStoresMeasurement() public {
        reg.recordMeasurement(1, 3200, "S2A_TEST", keccak256("a"), 1700000000);
        IVegaRegistry.Measurement[] memory m = reg.getMeasurements(1);
        assertEq(m.length, 1);
        assertEq(m[0].ndwi, 3200);
    }

    function test_EmitsWaterAlertBelowThreshold() public {
        vm.expectEmit(true, false, false, true);
        emit IVegaRegistry.WaterAlert(2, 900, 1000, 1700000000);
        reg.recordMeasurement(2, 900, "S2A_TEST", keccak256("b"), 1700000000);
    }

    function test_RevertWhen_NotPublisher() public {
        vm.prank(stranger);
        vm.expectRevert(VegaRegistry.NotPublisher.selector);
        reg.recordMeasurement(1, 3200, "S2A_TEST", keccak256("c"), 1700000000);
    }

    function test_RevertWhen_DuplicateHash() public {
        reg.recordMeasurement(1, 3200, "S2A_TEST", keccak256("d"), 1700000000);
        vm.expectRevert(abi.encodeWithSelector(VegaRegistry.AlreadyRecorded.selector, keccak256("d")));
        reg.recordMeasurement(1, 3200, "S2A_TEST", keccak256("d"), 1700000000);
    }

    // TODO(Contratos): test de setThreshold/setPublisher solo owner, historial con N mediciones.
}
