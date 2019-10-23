import {Node, QuorumSet} from "@stellarbeat/js-stellar-domain";
import NodeDetailsStorage from "../../src/entities/NodeDetailsStorage";
import NodeService from "../../src/services/NodeService";
import GeoDataStorage from "../../src/entities/GeoDataStorage";
import PublicKeyService from "../../src/services/PublicKeyService";
import QuorumSetService from "../../src/services/QuorumSetService";
import NodeV2Repository from "../../src/repositories/NodeV2Repository";
import CrawlV2 from "../../src/entities/CrawlV2";
import PublicKeyStorage from "../../src/entities/PublicKeyStorage";
//import QuorumSetStorage from "../../src/entities/QuorumSetStorage";
import NodeStorageV2 from "../../src/entities/NodeStorageV2";
import QuorumSetStorage from "../../src/entities/QuorumSetStorage";
//import QuorumSetStorage from "../../src/entities/QuorumSetStorage";

jest.mock('../../src/services/PublicKeyService');
jest.mock('../../src/services/QuorumSetService');
jest.mock('../../src/repositories/NodeV2Repository');

describe("createNewNodeV2Storage", () => {
    let node: Node;
    let publicKeyStorage: PublicKeyStorage;
    let crawlStart: CrawlV2;
    beforeEach(() => {
        node = new Node("localhost", 123, 'pk');
        publicKeyStorage = new PublicKeyStorage('pk');
        crawlStart = new CrawlV2();
    });
    test('createNewNodeV2Storage', async () => {
        node.geoData.longitude = 5;

        let saveSpy = jest.fn();
        (NodeV2Repository as any).mockImplementation(() => {
            return {
                save: saveSpy
            };
        });
        let getStoredPublicKeyOrCreateNewSpy = jest.fn(() => publicKeyStorage);
        (PublicKeyService as any).mockImplementation(() => {
            return {
                getStoredPublicKeyOrCreateNew: getStoredPublicKeyOrCreateNewSpy
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

        let nodeService = new NodeService(
            new PublicKeyService({} as any),
            new QuorumSetService({} as any),
            new NodeV2Repository()
        );
        let nodeStorage = await nodeService.createNewNodeV2Storage(node, crawlStart);
        let expectedNodeStorage = new NodeStorageV2(publicKeyStorage, node.ip, node.port, crawlStart);
        expectedNodeStorage.quorumSet = qsetStorage;
        expectedNodeStorage.geoData = GeoDataStorage.fromGeoData(node.geoData);

        expect(getStoredPublicKeyOrCreateNewSpy).toHaveBeenCalled();
        expect(getStoredPublicKeyOrCreateNewSpy).toHaveBeenCalled();
        expect(saveSpy).toHaveBeenCalled();
        expect(nodeStorage).toEqual(expectedNodeStorage);
    });

    test('createNewNodeV2StorageMinimal', async () => {
        let saveSpy = jest.fn();
        (NodeV2Repository as any).mockImplementation(() => {
            return {
                save: saveSpy
            };
        });
        let getStoredPublicKeyOrCreateNewSpy = jest.fn(() => publicKeyStorage);
        (PublicKeyService as any).mockImplementation(() => {
            return {
                getStoredPublicKeyOrCreateNew: getStoredPublicKeyOrCreateNewSpy
            };
        });
        let getStoredQuorumSetOrCreateNewSpy = jest.fn();
        (QuorumSetService as any).mockImplementation(() => {
            return {
                getStoredQuorumSetOrCreateNew: getStoredQuorumSetOrCreateNewSpy
            };
        });
        let nodeService = new NodeService(
            new PublicKeyService({} as any),
            new QuorumSetService({} as any),
            new NodeV2Repository()
        );
        let nodeStorage = await nodeService.createNewNodeV2Storage(node, crawlStart);
        let expectedNodeStorage = new NodeStorageV2(publicKeyStorage, node.ip, node.port, crawlStart);
        expect(getStoredPublicKeyOrCreateNewSpy).toHaveBeenCalled();

        expect(getStoredPublicKeyOrCreateNewSpy).toHaveBeenCalled();
        expect(saveSpy).toHaveBeenCalled();
        expect(nodeStorage).toEqual(expectedNodeStorage);
        expect(nodeStorage.quorumSet).toEqual(undefined);
    });
});

describe("geoData changed", () => {
    let nodeService = new NodeService(new PublicKeyService({} as any), new QuorumSetService({} as any), {} as any);
    let node = new Node("localhost");
    node.geoData.longitude = 1;
    node.geoData.latitude = 2;
    let geoDataStorage: GeoDataStorage;
    beforeEach(() => {
        geoDataStorage = new GeoDataStorage('US', 'United States', 1, 2);
    });

    test('latitude', () => {
        geoDataStorage.latitude = 4;
        expect(nodeService.geoDataChanged(node, geoDataStorage)).toBeTruthy();
    });

    test('longitude', () => {
        geoDataStorage.longitude = 4;
        expect(nodeService.geoDataChanged(node, geoDataStorage)).toBeTruthy();
    });

    test('not changed', () => {
        expect(nodeService.geoDataChanged(node, geoDataStorage)).toBeFalsy();
    });
});

describe("nodeDetails changed", () => {
    let nodeService = new NodeService(
        new PublicKeyService({} as any),
        new QuorumSetService({} as any),
        new NodeV2Repository()
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
        expect(nodeService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('history', () => {
        nodeDetailsStorage.historyUrl = 'new';
        expect(nodeService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('homeDomain', () => {
        nodeDetailsStorage.homeDomain = 'new';
        expect(nodeService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('host', () => {
        nodeDetailsStorage.host = 'new';
        expect(nodeService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('isp', () => {
        nodeDetailsStorage.isp = 'new';
        expect(nodeService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('ledgerVersion', () => {
        nodeDetailsStorage.ledgerVersion = 'new';
        expect(nodeService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('name', () => {
        nodeDetailsStorage.name = 'new';
        expect(nodeService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('overlay', () => {
        nodeDetailsStorage.overlayVersion = 'new';
        expect(nodeService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('overlaymin', () => {
        nodeDetailsStorage.overlayMinVersion = 'new';
        expect(nodeService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('version', () => {
        nodeDetailsStorage.versionStr = 'new';
        expect(nodeService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeTruthy();
    });
    test('no storage', () => {
        expect(nodeService.nodeDetailsChanged(node, undefined)).toBeTruthy();
    });
    test('not changed', () => {
        expect(nodeService.nodeDetailsChanged(node, nodeDetailsStorage)).toBeFalsy();
    })
});
