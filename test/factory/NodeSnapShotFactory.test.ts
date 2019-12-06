import NodeSnapShotFactory from "../../src/factory/NodeSnapShotFactory";
import NodeStorageV2 from "../../src/entities/NodeStorageV2";
import CrawlV2 from "../../src/entities/CrawlV2";
import {Node, QuorumSet} from "@stellarbeat/js-stellar-domain";
import NodeSnapShot from "../../src/entities/NodeSnapShot";
import GeoDataStorage from "../../src/entities/GeoDataStorage";
import QuorumSetStorage from "../../src/entities/QuorumSetStorage";
import NodeDetailsStorage from "../../src/entities/NodeDetailsStorage";

describe("createNewNodeSnapShot", () => {
    let node: Node;
    let crawlStart: CrawlV2;
    beforeEach(() => {
        node = new Node("localhost", 123, 'pk');
        crawlStart = new CrawlV2();
    });
    test('createNewNodeSnapShot', async () => {
        node.geoData.longitude = 5;
        node.quorumSet = new QuorumSet('hash', 1, ['a']);
        node.versionStr = 'v1';

        let factory = new NodeSnapShotFactory();
        let nodeStorage = new NodeStorageV2(node.publicKey);
        let newSnapShot = await factory.create(nodeStorage, node, crawlStart);
        let nodeSnapShot = new NodeSnapShot(nodeStorage, node.ip, node.port, crawlStart);
        nodeSnapShot.quorumSet = QuorumSetStorage.fromQuorumSet(node.quorumSet);
        nodeSnapShot.geoData = GeoDataStorage.fromGeoData(node.geoData);
        nodeSnapShot.nodeDetails = NodeDetailsStorage.fromNode(node);

        expect(newSnapShot).toEqual(nodeSnapShot);
    });

    test('createNewNodeSnapShotMinimal', async () => {
        let factory = new NodeSnapShotFactory();
        let nodeStorage = new NodeStorageV2(node.publicKey);
        let nodeSnapShot = factory.create(nodeStorage, node, crawlStart);
        let expectedNodeStorage = new NodeSnapShot(nodeStorage, node.ip, node.port, crawlStart);
        expect(nodeSnapShot).toEqual(expectedNodeStorage);
        expect(nodeSnapShot.quorumSet).toEqual(undefined);
        expect(nodeSnapShot.geoData).toBeUndefined();
        expect(nodeSnapShot.nodeDetails).toBeUndefined();
    });
});
