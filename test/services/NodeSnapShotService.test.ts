import NodeSnapShotService from "../../src/services/NodeSnapShotService";
import NodeSnapShotRepository from "../../src/repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../../src/factory/NodeSnapShotFactory";
import {Node} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../../src/entities/CrawlV2";
import NodeSnapShot from "../../src/entities/NodeSnapShot";
import NodeStorageV2 from "../../src/entities/NodeStorageV2";

jest.mock('../../src/repositories/NodeSnapShotRepository');

describe('getUpdatedSnapShots', () => {
    let snapShotFactory = new NodeSnapShotFactory();
    let nodeSnapShotService = new NodeSnapShotService(
        new NodeSnapShotRepository(),
        snapShotFactory
    );

    let nodes:Node[];
    let snapShots:NodeSnapShot[];
    let latestCrawl = new CrawlV2();

    beforeEach(() => {
        nodes = [];
        snapShots = [];
        let node1 = new Node('localhost');
        node1.publicKey = 'a';
        nodes.push(node1);
        let snapShot1 = snapShotFactory.create(new NodeStorageV2(node1.publicKey), node1, latestCrawl);

        let node2 = new Node('otherHost');
        node2.publicKey = 'b';
        nodes.push(node2);
        let snapShot2 = snapShotFactory.create(new NodeStorageV2(node2.publicKey), node2, latestCrawl);

        snapShots.push(...[snapShot1, snapShot2]);
    });

    test('first run', () => {
        let snapShots = nodeSnapShotService.getUpdatedSnapShots([], nodes, latestCrawl);
        expect(snapShots.length).toEqual(0);
    });

    test('no changes', () => {
        let updatedOrNewSnapShots = nodeSnapShotService.getUpdatedSnapShots(snapShots, nodes, latestCrawl);
        expect(updatedOrNewSnapShots.length).toEqual(0)
    });

    test('ip change in first node', () => {
        nodes[0].ip = 'newIp';
        let updatedOrNewSnapShots = nodeSnapShotService.getUpdatedSnapShots(snapShots, nodes, latestCrawl);
        expect(updatedOrNewSnapShots.length).toEqual(2);
        expect(updatedOrNewSnapShots[0].crawlEnd).toEqual(latestCrawl);
        expect(updatedOrNewSnapShots[0].ip).toEqual('localhost');
        expect(updatedOrNewSnapShots[1].crawlEnd).toBeUndefined();
        expect(updatedOrNewSnapShots[1].ip).toEqual('newIp');
    });

    test('no node found for snapshot because of publicKey change', () => {
        let updatedOrNewSnapShots = nodeSnapShotService.getUpdatedSnapShots(snapShots, [nodes[1]], latestCrawl);
        expect(updatedOrNewSnapShots.length).toEqual(0);
    })
});