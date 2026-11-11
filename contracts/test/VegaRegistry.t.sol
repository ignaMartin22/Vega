// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, Vm} from "forge-std/Test.sol";
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

    function _countAlerts(Vm.Log[] memory logs) internal pure returns (uint256 n) {
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == IVegaRegistry.WaterAlert.selector) n++;
        }
    }

    function test_RevertWhen_SetThresholdNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert(VegaRegistry.NotOwner.selector);
        reg.setThreshold(1, 500);
    }

    function test_RevertWhen_SetPublisherNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert(VegaRegistry.NotOwner.selector);
        reg.setPublisher(stranger, true);
    }

    function test_AuthorizedPublisherCanRecordThenRevoked() public {
        reg.setPublisher(stranger, true);
        vm.prank(stranger);
        reg.recordMeasurement(1, 2500, "S2A_PUB", keccak256("pub1"), 1700000001);
        IVegaRegistry.Measurement[] memory m = reg.getMeasurements(1);
        assertEq(m.length, 1);
        assertEq(m[0].ndwi, 2500);

        reg.setPublisher(stranger, false);
        vm.prank(stranger);
        vm.expectRevert(VegaRegistry.NotPublisher.selector);
        reg.recordMeasurement(1, 2500, "S2A_PUB", keccak256("pub2"), 1700000002);
    }

    function test_HistoryKeepsOrder() public {
        reg.recordMeasurement(3, 100, "SC_A", keccak256("h1"), 1000);
        reg.recordMeasurement(3, 200, "SC_B", keccak256("h2"), 2000);
        reg.recordMeasurement(3, 300, "SC_C", keccak256("h3"), 3000);
        IVegaRegistry.Measurement[] memory m = reg.getMeasurements(3);
        assertEq(m.length, 3);
        assertEq(m[0].ndwi, 100);
        assertEq(m[1].ndwi, 200);
        assertEq(m[2].ndwi, 300);
        assertEq(m[0].sceneId, "SC_A");
        assertEq(m[1].sceneId, "SC_B");
        assertEq(m[2].sceneId, "SC_C");
        assertEq(m[0].dataHash, keccak256("h1"));
        assertEq(m[1].dataHash, keccak256("h2"));
        assertEq(m[2].dataHash, keccak256("h3"));
        assertEq(m[0].timestamp, 1000);
        assertEq(m[1].timestamp, 2000);
        assertEq(m[2].timestamp, 3000);
    }

    function test_EmitsMeasurementRecorded() public {
        vm.expectEmit(true, false, false, true);
        emit IVegaRegistry.MeasurementRecorded(1, 3200, "S2A_EV", keccak256("ev"), 1700000000);
        reg.recordMeasurement(1, 3200, "S2A_EV", keccak256("ev"), 1700000000);
    }

    function test_NoAlertWithoutThreshold() public {
        vm.recordLogs();
        reg.recordMeasurement(1, int32(-500), "S2A_NT", keccak256("nt"), 1700000000);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(_countAlerts(logs), 0);
    }

    function test_NoAlertWhenEqualThreshold() public {
        vm.recordLogs();
        reg.recordMeasurement(2, 1000, "S2A_EQ", keccak256("eq"), 1700000000);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(_countAlerts(logs), 0);
    }

    function test_SetThresholdStoresAndZeroThresholdAlerts() public {
        assertFalse(reg.hasThreshold(5));
        reg.setThreshold(5, 0);
        assertTrue(reg.hasThreshold(5));
        assertEq(reg.thresholds(5), 0);

        vm.recordLogs();
        reg.recordMeasurement(5, int32(-1), "S2A_ZT", keccak256("zt"), 1700000000);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(_countAlerts(logs), 1);
    }

    function test_RevertWhen_NdwiOutOfRange() public {
        vm.expectRevert(abi.encodeWithSelector(VegaRegistry.InvalidNdwi.selector, int32(10001)));
        reg.recordMeasurement(1, 10001, "S2A_R", keccak256("r1"), 1700000000);
        vm.expectRevert(abi.encodeWithSelector(VegaRegistry.InvalidNdwi.selector, int32(-10001)));
        reg.recordMeasurement(1, int32(-10001), "S2A_R", keccak256("r2"), 1700000000);
    }

    function test_NdwiBoundsAreValid() public {
        reg.recordMeasurement(1, 10000, "S2A_B", keccak256("b1"), 1700000000);
        reg.recordMeasurement(1, int32(-10000), "S2A_B", keccak256("b2"), 1700000000);
        assertEq(reg.getMeasurements(1).length, 2);
    }

    function test_RevertWhen_EmptyHash() public {
        vm.expectRevert(VegaRegistry.EmptyHash.selector);
        reg.recordMeasurement(1, 3200, "S2A_EH", bytes32(0), 1700000000);
    }

    function testFuzz_AlertIffBelowThreshold(int32 ndwi, int32 threshold) public {
        ndwi = int32(bound(int256(ndwi), -10000, 10000));
        threshold = int32(bound(int256(threshold), -10000, 10000));
        reg.setThreshold(7, threshold);
        vm.recordLogs();
        reg.recordMeasurement(7, ndwi, "S2A_FZ", keccak256(abi.encode(ndwi, threshold)), 1700000000);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(_countAlerts(logs), ndwi < threshold ? 1 : 0);
    }
}
