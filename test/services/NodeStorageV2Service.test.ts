import NodeSnapShotFactory from "../../src/factory/NodeSnapShotFactory";
import NodeStorageV2Service from "../../src/services/NodeStorageV2Service";
import NodeStorageV2Repository from "../../src/repositories/NodeStorageV2Repository";
import NodeStorageV2Factory from "../../src/factory/NodeStorageV2Factory";
import NodeSnapShotService from "../../src/services/NodeSnapShotService";
import CrawlV2 from "../../src/entities/CrawlV2";
import {Node} from "@stellarbeat/js-stellar-domain";
import NodeStorageV2 from "../../src/entities/NodeStorageV2";
import NodeSnapShot from "../../src/entities/NodeSnapShot";

jest.mock('./../../src/repositories/NodeStorageV2Repository');
jest.mock('./../../src/services/NodeSnapShotService');
jest.mock('./../../src/factory/NodeStorageV2Factory');
describe('getMissingNodeStoresAndSnapShots', () => {
    test('1 missing node, not archived', async () => {
        let missingNodeStorage = new NodeStorageV2('a');
        missingNodeStorage.latestSnapshot = 'foo' as any;
        (NodeStorageV2Factory as jest.Mock).mockImplementation(
            () => {
                return {
                    create: jest.fn(() => missingNodeStorage),
                }
            }
        );
        let nodeStorageV2Factory = new NodeStorageV2Factory(new NodeSnapShotFactory());
        (NodeStorageV2Repository as jest.Mock).mockImplementation(
            () => {
                return {
                    findByPublicKeyWithLatestSnapShot: jest.fn(),
                }
            }
        );

        let missingNode = new Node('localhost');

        let nodeStorageV2Repository = new NodeStorageV2Repository();
        let nodeSnapShotService = new NodeSnapShotService({} as any, {} as any);

        let nodeStorageV2Service = new NodeStorageV2Service(
            nodeStorageV2Repository,
            nodeSnapShotService,
            nodeStorageV2Factory
        );

        let crawl = new CrawlV2();
        crawl.id = 1;
        let snapShots = await nodeStorageV2Service.getMissingNodeStoresAndSnapShots([missingNode], crawl);

        expect(nodeStorageV2Repository.findByPublicKeyWithLatestSnapShot).toHaveBeenCalledTimes(1);
        expect(snapShots).toEqual(['foo']);
    });
    test('1 missing node, archived', async () => {
        let nodeStorageV2Factory = new NodeStorageV2Factory(new NodeSnapShotFactory());

        (NodeStorageV2Factory as jest.Mock).mockImplementation(
            () => {
                return {
                    create: jest.fn(() => 'foo'),
                }
            }
        );

        let archivedNode = new NodeStorageV2('a');
        archivedNode.latestSnapshot = new NodeSnapShot(archivedNode, new CrawlV2(), 'localhost', 1);
        archivedNode.latestSnapshot.endCrawl = new CrawlV2();

        (NodeStorageV2Repository as jest.Mock).mockImplementation(
            () => {
                return {
                    findByPublicKeyWithLatestSnapShot: jest.fn(() => archivedNode),
                }
            }
        );

        (NodeSnapShotService as jest.Mock).mockImplementation(
            () => {
                return {
                    saveSnapShots: jest.fn(),
                    createSnapShot: jest.fn(),
                    createUpdatedSnapShot: jest.fn(() => 'bar')
                }
            }
        );

        let nodeStorageV2Repository = new NodeStorageV2Repository();
        let nodeSnapShotService = new NodeSnapShotService({} as any, {} as any);

        let nodeStorageV2Service = new NodeStorageV2Service(
            nodeStorageV2Repository,
            nodeSnapShotService,
            nodeStorageV2Factory
        );

        let crawl = new CrawlV2();
        crawl.id = 1;
        let snapShots = await nodeStorageV2Service.getMissingNodeStoresAndSnapShots([new Node('localhost')], crawl);

        expect(nodeStorageV2Repository.findByPublicKeyWithLatestSnapShot).toHaveBeenCalledTimes(1);
        expect(nodeSnapShotService.createUpdatedSnapShot).toHaveBeenCalled();
        expect(snapShots).toEqual(['bar']);
    });
});