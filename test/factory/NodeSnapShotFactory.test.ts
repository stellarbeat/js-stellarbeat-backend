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
        node = new Node('pk');
        crawlStart = new CrawlV2();
    });

    test('createNewNodeSnapShot', async () => {
        node.geoData.longitude = 5;
        node.quorumSet = new QuorumSet('hash', 1, ['a']);
        node.versionStr = 'v1';

        const factory = new NodeSnapShotFactory();
        const nodeStorage = new NodePublicKeyStorage(node.publicKey!);
        const newSnapShot = await factory.create(nodeStorage, node, crawlStart.time);
        const nodeSnapShot = new NodeSnapShot(nodeStorage, crawlStart.time, node.ip, node.port);
        nodeSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(node.quorumSet);
        nodeSnapShot.geoData = NodeGeoDataStorage.fromGeoData(node.geoData);
        nodeSnapShot.nodeDetails = NodeDetailsStorage.fromNode(node);
        nodeSnapShot.organizationIdStorage = null;

        expect(newSnapShot).toEqual(nodeSnapShot);
    });

    test('createNewNodeSnapShotMinimal', async () => {
        const factory = new NodeSnapShotFactory();
        const nodeStorage = new NodePublicKeyStorage(node.publicKey!);
        const nodeSnapShot = factory.create(nodeStorage, node, crawlStart.time);
        const expectedNodeStorage = new NodeSnapShot(nodeStorage, crawlStart.time, node.ip, node.port);
        expectedNodeStorage.quorumSet = null;
        expectedNodeStorage.nodeDetails = null;
        expectedNodeStorage.organizationIdStorage = null;
        expect(nodeSnapShot).toEqual(expectedNodeStorage);
        expect(nodeSnapShot.quorumSet).toBeNull();
        expect(nodeSnapShot.geoData).toBeNull();
        expect(nodeSnapShot.nodeDetails).toBeNull();
    });
});
