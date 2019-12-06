import {Node} from "@stellarbeat/js-stellar-domain";
import NodeSnapShot from "../../src/entities/NodeSnapShot";
import NodeStorageV2 from "../../src/entities/NodeStorageV2";
import CrawlV2 from "../../src/entities/CrawlV2";
import QuorumSetStorage from "../../src/entities/QuorumSetStorage";

describe("nodeIpPortChanged", () => {
    test('no', () => {
        let node = new Node('localhost');
        let snapShot = new NodeSnapShot(new NodeStorageV2('pk'), 'localhost', 11625, new CrawlV2());
        expect(snapShot.nodeIpPortChanged(node)).toBeFalsy();
    });
    test('ip changed', () => {
        let node = new Node('localhost2');
        let snapShot = new NodeSnapShot(new NodeStorageV2('pk'), 'localhost', 11625, new CrawlV2());
        expect(snapShot.nodeIpPortChanged(node)).toBeTruthy();
    });
    test('port changed', () => {
        let node = new Node('localhost', 11624);
        let snapShot = new NodeSnapShot(new NodeStorageV2('pk'), 'localhost', 11625, new CrawlV2());
        expect(snapShot.nodeIpPortChanged(node)).toBeTruthy();
    });
});
describe("quorumSet changed", () => {
    let node:Node;
    let nodeSnapShot: NodeSnapShot;

    beforeEach(() => {
        let nodeStorage = new NodeStorageV2('a');
        nodeSnapShot = new NodeSnapShot(nodeStorage, 'localhost', 8000, new CrawlV2());
        node = new Node("localhost");
    });

    test('first change', () => {
        expect(nodeSnapShot.quorumSetChanged(node)).toBeFalsy();
        node.quorumSet.validators.push('a');
        expect(nodeSnapShot.quorumSetChanged(node)).toBeTruthy();
    });

    test('no change', () => {
        nodeSnapShot.quorumSet = QuorumSetStorage.fromQuorumSet(node.quorumSet);
        expect(nodeSnapShot.quorumSetChanged(node)).toBeFalsy();
    });

    test('change', () => {
        let newlyDetectedNode = new Node("localhost");
        node.quorumSet.validators.push('a');
        node.quorumSet.hashKey = 'old';
        nodeSnapShot.quorumSet = QuorumSetStorage.fromQuorumSet(node.quorumSet);
        newlyDetectedNode.quorumSet.hashKey = 'new';
        expect(nodeSnapShot.quorumSetChanged(newlyDetectedNode)).toBeTruthy();
    })
});