import {Node} from "@stellarbeat/js-stellar-domain";
import NodeSnapShot from "../../src/entities/NodeSnapShot";
import NodePublicKey from "../../src/entities/NodePublicKey";
import CrawlV2 from "../../src/entities/CrawlV2";
import QuorumSetStorage from "../../src/entities/QuorumSetStorage";
import NodeDetailsStorage from "../../src/entities/NodeDetailsStorage";
import GeoDataStorage from "../../src/entities/GeoDataStorage";

describe("nodeIpPortChanged", () => {
    let crawl = new CrawlV2();
    test('no', () => {
        let node = new Node('localhost');
        let snapShot = new NodeSnapShot(new NodePublicKey('pk'), crawl, 'localhost', 11625);
        expect(snapShot.nodeIpPortChanged(node)).toBeFalsy();
    });
    test('ip changed', () => {
        let node = new Node('localhost2');
        let snapShot = new NodeSnapShot(new NodePublicKey('pk'), crawl, 'localhost', 11625);
        expect(snapShot.nodeIpPortChanged(node)).toBeTruthy();
    });
    test('port changed', () => {
        let node = new Node('localhost', 11624);
        let snapShot = new NodeSnapShot(new NodePublicKey('pk'), crawl, 'localhost', 11625);
        expect(snapShot.nodeIpPortChanged(node)).toBeTruthy();
    });
});
describe("quorumSet changed", () => {
    let node: Node;
    let nodeSnapShot: NodeSnapShot;
    let crawl = new CrawlV2();

    beforeEach(() => {
        let nodeStorage = new NodePublicKey('a');
        nodeSnapShot = new NodeSnapShot(nodeStorage, crawl,'localhost', 8000);
        nodeSnapShot.quorumSet = null;
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

describe("nodeDetails changed", () => {
    let node: Node;
    let nodeDetailsStorage: NodeDetailsStorage;
    let nodeSnapShot: NodeSnapShot;
    let crawl = new CrawlV2();

    beforeEach(() => {
        node = new Node("localhost");
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
        nodeDetailsStorage = new NodeDetailsStorage();
        nodeDetailsStorage.ledgerVersion = '1';
        nodeDetailsStorage.overlayMinVersion = '3';
        nodeDetailsStorage.overlayVersion = '5';
        nodeDetailsStorage.versionStr = 'v1';
        nodeDetailsStorage.alias = 'alias';
        nodeDetailsStorage.historyUrl = 'url';
        nodeDetailsStorage.homeDomain = 'home';
        nodeDetailsStorage.host = 'host';
        nodeDetailsStorage.isp = 'isp';
        nodeDetailsStorage.name = 'name';
        let nodeStorage = new NodePublicKey('a');
        nodeSnapShot = new NodeSnapShot(nodeStorage, crawl,'localhost', 8000);
        nodeSnapShot.nodeDetails = nodeDetailsStorage;
    });

    test('first change', () => {
        nodeSnapShot.nodeDetails = null;
        node = new Node('localhost');

        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeFalsy();
        node.versionStr = '1.0';
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });

    test('alias', () => {
        nodeDetailsStorage.alias = 'alias2';
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });
    test('history', () => {
        nodeDetailsStorage.historyUrl = 'new';
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });
    test('homeDomain', () => {
        nodeDetailsStorage.homeDomain = 'new';
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });
    test('host', () => {
        nodeDetailsStorage.host = 'new';
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });
    test('isp', () => {
        nodeDetailsStorage.isp = 'new';
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });
    test('ledgerVersion', () => {
        nodeDetailsStorage.ledgerVersion = 'new';
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });
    test('name', () => {
        nodeDetailsStorage.name = 'new';
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });
    test('overlay', () => {
        nodeDetailsStorage.overlayVersion = 'new';
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });
    test('overlaymin', () => {
        nodeDetailsStorage.overlayMinVersion = 'new';
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });
    test('version', () => {
        nodeDetailsStorage.versionStr = 'new';
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });
    test('no storage', () => {
        nodeSnapShot.nodeDetails = null;
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeTruthy();
    });
    test('not changed', () => {
        expect(nodeSnapShot.nodeDetailsChanged(node)).toBeFalsy();
    })
});

describe("hasNodeChanged", () => {
    let node: Node;
    let nodeSnapShot: NodeSnapShot;
    let crawl = new CrawlV2();

    beforeEach(() => {
        node = new Node("localhost");
        let nodeStorage = new NodePublicKey('a');
        nodeSnapShot = new NodeSnapShot(nodeStorage, crawl,node.ip, node.port);
        nodeSnapShot.nodeDetails = null;
        nodeSnapShot.geoData = null;
        nodeSnapShot.quorumSet = null;
    });
    test('no', () => {
        expect(nodeSnapShot.hasNodeChanged(node)).toBeFalsy();
    });
    test('ip changed', () => {
        node.ip = 'localhost3';
        expect(nodeSnapShot.hasNodeChanged(node)).toBeTruthy();
    });
    test('qset changed', () => {
        node.quorumSet.validators.push('a');
        expect(nodeSnapShot.hasNodeChanged(node)).toBeTruthy();
    });
    test('geo changed', () => {
        node.geoData.longitude = 123;
        expect(nodeSnapShot.hasNodeChanged(node)).toBeTruthy();
    });
    test('details', () => {
        node.versionStr = 'newVersion';
        expect(nodeSnapShot.hasNodeChanged(node)).toBeTruthy();
    });
});

describe("geoData changed", () => {
    let node: Node;
    let geoDataStorage: GeoDataStorage;
    let nodeSnapShot: NodeSnapShot;
    let crawl = new CrawlV2();

    beforeEach(() => {
        node = new Node("localhost");
        node.geoData.longitude = 2;
        node.geoData.latitude = 1;
        node.geoData.countryCode = 'US';
        node.geoData.countryName = 'United States';
        geoDataStorage = new GeoDataStorage();
        geoDataStorage.countryCode = 'US';
        geoDataStorage.countryName = 'United States';
        geoDataStorage.latitude = 1;
        geoDataStorage.longitude = 2;
        let nodeStorage = new NodePublicKey('a');
        nodeSnapShot = new NodeSnapShot(nodeStorage, crawl,'localhost', 8000);
        nodeSnapShot.geoData = geoDataStorage;
    });

    test('first change', () => {
        nodeSnapShot.geoData = null;
        node.geoData.longitude = undefined;
        node.geoData.latitude = undefined;

        expect(nodeSnapShot.geoDataChanged(node)).toBeFalsy();
        node.geoData.longitude = 1;
        expect(nodeSnapShot.geoDataChanged(node)).toBeTruthy();
        node.geoData.latitude = 2;
        expect(nodeSnapShot.geoDataChanged(node)).toBeTruthy();
    });

    test('latitude', () => {
        geoDataStorage.latitude = 4;
        expect(nodeSnapShot.geoDataChanged(node)).toBeTruthy();
    });

    test('longitude', () => {
        geoDataStorage.longitude = 4;
        expect(nodeSnapShot.geoDataChanged(node)).toBeTruthy();
    });

    test('not changed', () => {
        expect(nodeSnapShot.geoDataChanged(node)).toBeFalsy();
    });
});