import NodeStorageV2Factory from "../../src/factory/NodeStorageV2Factory";
import NodeSnapShotFactory from "../../src/factory/NodeSnapShotFactory";
import {Node} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../../src/entities/CrawlV2";
import NodeStorageV2 from "../../src/entities/NodeStorageV2";

describe("create", () => {
    test('normal', () => {
        let snapShotFactory = new NodeSnapShotFactory();
        let factory = new NodeStorageV2Factory(snapShotFactory);
        let node = new Node('localhost');
        node.publicKey = 'a';
        node.quorumSet.threshold = 2;
        node.quorumSet.validators.push('b');
        let crawl  = new CrawlV2();

        let nodeStorage = factory.create(node, crawl);

        expect(nodeStorage).toBeInstanceOf(NodeStorageV2);
        expect(nodeStorage.publicKey).toEqual(node.publicKey);
        expect(nodeStorage.latestSnapshot.ip).toEqual(node.ip);
    });
});