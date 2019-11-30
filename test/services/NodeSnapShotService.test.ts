import {Node, QuorumSet} from "@stellarbeat/js-stellar-domain";
import NodeDetailsStorage from "../../src/entities/NodeDetailsStorage";
import NodeSnapShotService from "../../src/services/NodeSnapShotService";
import GeoDataStorage from "../../src/entities/GeoDataStorage";
import QuorumSetService from "../../src/services/QuorumSetService";
import NodeSnapShotRepository from "../../src/repositories/NodeSnapShotRepository";
import CrawlV2 from "../../src/entities/CrawlV2";
//import QuorumSetStorage from "../../src/entities/QuorumSetStorage";
import NodeSnapShot from "../../src/entities/NodeSnapShot";
import QuorumSetStorage from "../../src/entities/QuorumSetStorage";
//import QuorumSetStorage from "../../src/entities/QuorumSetStorage";

jest.mock('../../src/services/QuorumSetService');
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
        let qsetStorage = new QuorumSetStorage(
            'hash',
            new QuorumSet('hash', 1, ['a'])
        );
        let getStoredQuorumSetOrCreateNewSpy = jest.fn(() => qsetStorage);

        (QuorumSetService as any).mockImplementation(() => {
            return {
                getStoredQuorumSetOrCreateNew: getStoredQuorumSetOrCreateNewSpy
            };
        });

        let nodeService = new NodeSnapShotService(
            new QuorumSetService({} as any),
            new NodeSnapShotRepository()
        );
        let nodeStorage = await nodeService.createNewNodeSnapShot(node, crawlStart);
        let nodeSnapShot = new NodeSnapShot(node.publicKey, node.ip, node.port, crawlStart);
        nodeSnapShot.quorumSet = qsetStorage;
        nodeSnapShot.geoData = GeoDataStorage.fromGeoData(node.geoData);

        expect(saveSpy).toHaveBeenCalled();
        expect(nodeStorage).toEqual(nodeSnapShot);
    });

    test('createNewNodeSnapShotMinimal', async () => {
        let saveSpy = jest.fn();
        (NodeSnapShotRepository as any).mockImplementation(() => {
            return {
                save: saveSpy
            };
        });
        let getStoredQuorumSetOrCreateNewSpy = jest.fn();
        (QuorumSetService as any).mockImplementation(() => {
            return {
                getStoredQuorumSetOrCreateNew: getStoredQuorumSetOrCreateNewSpy
            };
        });
        let nodeService = new NodeSnapShotService(
            new QuorumSetService({} as any),
            new NodeSnapShotRepository()
        );
        let nodeStorage = await nodeService.createNewNodeSnapShot(node, crawlStart);
        let expectedNodeStorage = new NodeSnapShot(node.publicKey, node.ip, node.port, crawlStart);
        expect(saveSpy).toHaveBeenCalled();
        expect(nodeStorage).toEqual(expectedNodeStorage);
        expect(nodeStorage.quorumSet).toEqual(undefined);
    });
});

describe("geoData changed", () => {
    let nodeSnapShotService = new NodeSnapShotService(new QuorumSetService({} as any), {} as any);
    let node = new Node("localhost");
    node.geoData.longitude = 1;
    node.geoData.latitude = 2;
    let geoDataStorage: GeoDataStorage;
    beforeEach(() => {
        geoDataStorage = new GeoDataStorage('US', 'United States', 1, 2);
    });

    test('latitude', () => {
        geoDataStorage.latitude = 4;
        expect(nodeSnapShotService.geoDataChanged(node, geoDataStorage)).toBeTruthy();
    });

    test('longitude', () => {
        geoDataStorage.longitude = 4;
        expect(nodeSnapShotService.geoDataChanged(node, geoDataStorage)).toBeTruthy();
    });

    test('not changed', () => {
        expect(nodeSnapShotService.geoDataChanged(node, geoDataStorage)).toBeFalsy();
    });
});

describe("nodeDetails changed", () => {
    let nodeSnapShotService = new NodeSnapShotService(
        new QuorumSetService({} as any),
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

    let nodeDetailsStorage = new NodeDetailsStorage();
    beforeEach(() => {
        nodeDetailsStorage.alias = 'alias';
        nodeDetailsStorage.historyUrl = 'url';
        nodeDetailsStorage.homeDomain = 'home';
        nodeDetailsStorage.host = 'host';
        nodeDetailsStorage.isp = 'isp';
        nodeDetailsStorage.ledgerVersion = '1';
        nodeDetailsStorage.name = 'name';
        nodeDetailsStorage.overlayMinVersion = '3';
        nodeDetailsStorage.versionStr = 'v1';
        nodeDetailsStorage.overlayVersion = '5';
    });

    test('alias', () => {
        nodeDetailsStorage.alias = 'alias2';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('history', () => {
        nodeDetailsStorage.historyUrl = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('homeDomain', () => {
        nodeDetailsStorage.homeDomain = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('host', () => {
        nodeDetailsStorage.host = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('isp', () => {
        nodeDetailsStorage.isp = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('ledgerVersion', () => {
        nodeDetailsStorage.ledgerVersion = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('name', () => {
        nodeDetailsStorage.name = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('overlay', () => {
        nodeDetailsStorage.overlayVersion = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('overlaymin', () => {
        nodeDetailsStorage.overlayMinVersion = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('version', () => {
        nodeDetailsStorage.versionStr = 'new';
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('no storage', () => {
        expect(nodeSnapShotService.nodeDetailsChanged(node, undefined)).toBeTruthy();
    });
    test('not changed', () => {
        expect(nodeSnapShotService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeFalsy();
    })
});
