import {Node, QuorumSet} from "@stellarbeat/js-stellar-domain";
import NodeDetailsStorage from "../../src/entities/NodeDetailsStorage";
import NodeSnapShotService from "../../src/services/NodeSnapShotService";
import GeoDataStorage from "../../src/entities/GeoDataStorage";
import NodeSnapShotRepository from "../../src/repositories/NodeSnapShotRepository";
import CrawlV2 from "../../src/entities/CrawlV2";
//import QuorumSetStorage from "../../src/entities/QuorumSetStorage";
import NodeSnapShot from "../../src/entities/NodeSnapShot";
import QuorumSetStorage from "../../src/entities/QuorumSetStorage";
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
        let newSnapShot = await nodeService.createNewNodeSnapShot(node, crawlStart);
        let nodeSnapShot = new NodeSnapShot(node.publicKey, node.ip, node.port, crawlStart);
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
        let nodeStorage = await nodeService.createNewNodeSnapShot(node, crawlStart);
        let expectedNodeStorage = new NodeSnapShot(node.publicKey, node.ip, node.port, crawlStart);
        expect(saveSpy).toHaveBeenCalled();
        expect(nodeStorage).toEqual(expectedNodeStorage);
        expect(nodeStorage.quorumSet).toEqual(undefined);
        expect(nodeStorage.geoData).toBeUndefined();
        expect(nodeStorage.nodeDetails).toBeUndefined();
    });
});

describe("geoData changed", () => {
    expect(true).toBeFalsy(); //todo test nodeSnapShot.nodeDetails === undefined
    let nodeSnapShotService = new NodeSnapShotService({} as any);
    let node = new Node("localhost");
    node.geoData.longitude = 1;
    node.geoData.latitude = 2;
    let geoDataStorage: GeoDataStorage;
    let nodeSnapShot: NodeSnapShot;
    beforeEach(() => {
        geoDataStorage = new GeoDataStorage('US', 'United States', 1, 2);
        nodeSnapShot = new NodeSnapShot('a', 'localhost', 8000, new CrawlV2());
        nodeSnapShot.geoData = geoDataStorage;
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

describe("quorumSet changed", () => {
    expect(true).toBeFalsy(); //todo
});

describe("nodeDetails changed", () => {

    expect(true).toBeFalsy(); //todo test nodeSnapShot.nodeDetails === undefined

    let nodeSnapShotService = new NodeSnapShotService(
        new NodeSnapShotRepository()
    );
    let node = new Node("localhost");
    node.alias = 'alias';
    node.historyUrl = 'url';
    node.homeDomain = 'home';
    node.host = 'host';
    node.isp = 'isp';
    node.ledgerVersion = '1';
    node.name = 'name';
    node.overlayMinVersion = '3';
    node.versionStr = 'v1';
    node.overlayVersion = '5';

    let nodeDetailsStorage: NodeDetailsStorage;
    let nodeSnapShot: NodeSnapShot;

    beforeEach(() => {
        nodeDetailsStorage = new NodeDetailsStorage(
            '1', '5', '3', 'v1'
        );
        nodeDetailsStorage.alias = 'alias';
        nodeDetailsStorage.historyUrl = 'url';
        nodeDetailsStorage.homeDomain = 'home';
        nodeDetailsStorage.host = 'host';
        nodeDetailsStorage.isp = 'isp';
        nodeDetailsStorage.name = 'name';
        nodeSnapShot = new NodeSnapShot('a', 'localhost', 8000, new CrawlV2());
nodeSnapShot.nodeDetails = nodeDetailsStorage;
    });

    test('alias', () => {
        nodeDetailsStorage.alias = 'alias2';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeTruthy();
    });
    test('history', () => {
        nodeDetailsStorage.historyUrl = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeTruthy();
    });
    test('homeDomain', () => {
        nodeDetailsStorage.homeDomain = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeTruthy();
    });
    test('host', () => {
        nodeDetailsStorage.host = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeTruthy();
    });
    test('isp', () => {
        nodeDetailsStorage.isp = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeTruthy();
    });
    test('ledgerVersion', () => {
        nodeDetailsStorage.ledgerVersion = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeTruthy();
    });
    test('name', () => {
        nodeDetailsStorage.name = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeTruthy();
    });
    test('overlay', () => {
        nodeDetailsStorage.overlayVersion = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeTruthy();
    });
    test('overlaymin', () => {
        nodeDetailsStorage.overlayMinVersion = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeTruthy();
    });
    test('version', () => {
        nodeDetailsStorage.versionStr = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeTruthy();
    });
    test('no storage', () => {
        nodeSnapShot.nodeDetails = undefined;
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeTruthy();
    });
    test('not changed', () => {
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeSnapShot)).toBeFalsy();
    })
});