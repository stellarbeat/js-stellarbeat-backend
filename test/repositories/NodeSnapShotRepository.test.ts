import {Container} from "inversify";
import Kernel from "../../src/Kernel";
import {Connection} from "typeorm";
import {Node} from "@stellarbeat/js-stellar-domain";
import NodeSnapShotFactory from "../../src/factory/NodeSnapShotFactory";
import NodePublicKeyStorage from "../../src/entities/NodePublicKeyStorage";
import NodeSnapShotRepository from "../../src/repositories/NodeSnapShotRepository";

describe("test queries", () => {
    jest.setTimeout(60000); //slow integration tests
    let container:Container;
    let kernel = new Kernel();
    let nodeSnapShotRepository:NodeSnapShotRepository;

    beforeEach(async () => {
        await kernel.initializeContainer();
        container = kernel.container;
        nodeSnapShotRepository = container.get(NodeSnapShotRepository);

    });

    afterEach(async () => {
        await container.get(Connection).close();
    });

    test('findLatestSnapShots', async () => {
        let node = new Node('localhost', 12345, 'a')
        node.quorumSet.threshold = 1;
        node.quorumSet.hashKey = 'hash';
        node.quorumSet.validators.push('a');
        node.geoData.countryCode = 'US';
        node.geoData.countryName = 'United States';
        node.geoData.longitude = 1;
        node.geoData.latitude = 1;
        node.versionStr = 'v1';
        let nodeSnapShotFactory = container.get(NodeSnapShotFactory);
        let publicKeyStorage = new NodePublicKeyStorage(node.publicKey!);
        let snapshot1 = nodeSnapShotFactory.create(publicKeyStorage, node, new Date());
        await nodeSnapShotRepository.save(snapshot1);
        node.versionStr = 'v2';
        let snapShot2 = nodeSnapShotFactory.createUpdatedSnapShot(snapshot1, node, new Date(), null);
        await nodeSnapShotRepository.save(snapShot2);

        let snapShots = await nodeSnapShotRepository.findLatestSnapShots(publicKeyStorage);
        expect(snapShots.length).toEqual(2);
        expect(snapShots[0]!.nodeDetails!.versionStr).toEqual('v2');
        expect(snapShots[1]!.nodeDetails!.versionStr).toEqual('v1');
    });
});
