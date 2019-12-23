import NodeSnapShotFactory from "../../src/factory/NodeSnapShotFactory";
import NodePublicKeyStorage from "../../src/entities/NodePublicKeyStorage";
import CrawlV2 from "../../src/entities/CrawlV2";
import {Node, QuorumSet} from "@stellarbeat/js-stellar-domain";
import NodeSnapShot from "../../src/entities/NodeSnapShot";
import NodeGeoDataStorage from "../../src/entities/NodeGeoDataStorage";
import NodeQuorumSetStorage from "../../src/entities/NodeQuorumSetStorage";
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
        let nodeStorage = new NodePublicKeyStorage(node.publicKey);
        let newSnapShot = await factory.create(nodeStorage, node, crawlStart);
        let nodeSnapShot = new NodeSnapShot(nodeStorage, crawlStart, node.ip, node.port);
        nodeSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(node.quorumSet);
        nodeSnapShot.geoData = NodeGeoDataStorage.fromGeoData(node.geoData);
        nodeSnapShot.nodeDetails = NodeDetailsStorage.fromNode(node);

        expect(newSnapShot).toEqual(nodeSnapShot);
    });

    test('createNewNodeSnapShotMinimal', async () => {
        let factory = new NodeSnapShotFactory();
        let nodeStorage = new NodePublicKeyStorage(node.publicKey);
        let nodeSnapShot = factory.create(nodeStorage, node, crawlStart);
        let expectedNodeStorage = new NodeSnapShot(nodeStorage, crawlStart, node.ip, node.port);
        expectedNodeStorage.quorumSet = null;
        expectedNodeStorage.nodeDetails = null;
        expect(nodeSnapShot).toEqual(expectedNodeStorage);
        expect(nodeSnapShot.quorumSet).toBeNull();
        expect(nodeSnapShot.geoData).toBeNull();
        expect(nodeSnapShot.nodeDetails).toBeNull();
    });
});
