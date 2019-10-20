import {Node} from "@stellarbeat/js-stellar-domain";
import NodeDetailsStorage from "../../src/entities/NodeDetailsStorage";
import NodeService from "../../src/services/NodeService";
import GeoDataStorage from "../../src/entities/GeoDataStorage";

jest.mock('../../src/repositories/CrawlRepository');
const nodeService = new NodeService();


describe("geoData changed", () => {
    let node = new Node("localhost");
    node.geoData.longitude = 1;
    node.geoData.latitude = 2;
    let geoDataStorage:GeoDataStorage;
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
