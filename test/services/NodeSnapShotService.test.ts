import {Node, QuorumSet} from "@stellarbeat/js-stellar-domain";
import NodeDetailsStorage from "../../src/entities/NodeDetailsStorage";
import NodeSnapShotService from "../../src/services/NodeSnapShotService";
import GeoDataStorage from "../../src/entities/GeoDataStorage";
import NodeSnapShotRepository from "../../src/repositories/NodeSnapShotRepository";
import CrawlV2 from "../../src/entities/CrawlV2";
//import QuorumSetStorage from "../../src/entities/QuorumSetStorage";
import NodeSnapShot from "../../src/entities/NodeSnapShot";
import QuorumSetStorage from "../../src/entities/QuorumSetStorage";
import NodeStorageV2 from "../../src/entities/NodeStorageV2";
//import QuorumSetStorage from "../../src/entities/QuorumSetStorage";

jest.mock('../../src/repositories/NodeSnapShotRepository');

describe("createNewNodeSnapShot", () => {
    let node: Node;
    let crawlStart: CrawlV2;
    beforeEach(() => {
        node = new Node("localhost", 123, 'pk');
        crawlStart = new CrawlV2();
    });
    test('createNewNodeSnapShot', async () => {
        node.geoData.longitude = 5;

        let saveSpy = jest.fn();
        (NodeSnapShotRepository as any).mockImplementation(() => {
            return {
                save: saveSpy
            };
        });
        node.quorumSet = new QuorumSet('hash', 1, ['a']);
        node.versionStr = 'v1';

        let nodeService = new NodeSnapShotService(
            new NodeSnapShotRepository()
        );
        let nodeStorage = new NodeStorageV2(node.publicKey);
        let newSnapShot = await nodeService.createNewNodeSnapShot(nodeStorage, node, crawlStart);
        let nodeSnapShot = new NodeSnapShot(nodeStorage, node.ip, node.port, crawlStart);
        nodeSnapShot.quorumSet = QuorumSetStorage.fromQuorumSet(node.quorumSet);
        nodeSnapShot.geoData = GeoDataStorage.fromGeoData(node.geoData);
        nodeSnapShot.nodeDetails = NodeDetailsStorage.fromNode(node);

        expect(saveSpy).toHaveBeenCalled();
        expect(newSnapShot).toEqual(nodeSnapShot);
    });

    test('createNewNodeSnapShotMinimal', async () => {
        let saveSpy = jest.fn();
        (NodeSnapShotRepository as any).mockImplementation(() => {
            return {
                save: saveSpy
            };
        });

        let nodeService = new NodeSnapShotService(
            new NodeSnapShotRepository()
        );
        let nodeStorage = new NodeStorageV2(node.publicKey);
        let nodeSnapShot = await nodeService.createNewNodeSnapShot(nodeStorage, node, crawlStart);
        let expectedNodeStorage = new NodeSnapShot(nodeStorage, node.ip, node.port, crawlStart);
        expect(saveSpy).toHaveBeenCalled();
        expect(nodeSnapShot).toEqual(expectedNodeStorage);
        expect(nodeSnapShot.quorumSet).toEqual(undefined);
        expect(nodeSnapShot.geoData).toBeUndefined();
        expect(nodeSnapShot.nodeDetails).toBeUndefined();
    });
});

describe("geoData changed", () => {
    let nodeSnapShotService = new NodeSnapShotService({} as any);
    let node = new Node("localhost");
    node.geoData.longitude = 1;
    node.geoData.latitude = 2;
    let geoDataStorage: GeoDataStorage;
    let nodeSnapShot: NodeSnapShot;
    beforeEach(() => {
        geoDataStorage = new GeoDataStorage('US', 'United States', 1, 2);
        let nodeStorage = new NodeStorageV2('a');
        nodeSnapShot = new NodeSnapShot(nodeStorage, 'localhost', 8000, new CrawlV2());
        nodeSnapShot.geoData = geoDataStorage;
    });

    test('first change', () => {
        nodeSnapShot.geoData = undefined;
        node.geoData.longitude = undefined;
        node.geoData.latitude = undefined;

        expect(nodeSnapShotService.geoDataChanged(node, nodeSnapShot)).toBeFalsy();
        node.geoData.longitude = 1;
        expect(nodeSnapShotService.geoDataChanged(node, nodeSnapShot)).toBeTruthy();
        node.geoData.latitude = 2;
        expect(nodeSnapShotService.geoDataChanged(node, nodeSnapShot)).toBeTruthy();
    });

    test('latitude', () => {
        geoDataStorage.latitude = 4;
        expect(nodeSnapShotService.geoDataChanged(node, nodeSnapShot)).toBeTruthy();
    });

    test('longitude', () => {
        geoDataStorage.longitude = 4;
        expect(nodeSnapShotService.geoDataChanged(node, nodeSnapShot)).toBeTruthy();
    });

    test('not changed', () => {
        expect(nodeSnapShotService.geoDataChanged(node, nodeSnapShot)).toBeFalsy();
    });
});
