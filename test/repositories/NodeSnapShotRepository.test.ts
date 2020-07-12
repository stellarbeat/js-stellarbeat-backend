import {Container} from "inversify";
import Kernel from "../../src/Kernel";
import {Connection} from "typeorm";
import {Node} from "@stellarbeat/js-stellar-domain";
import NodeSnapShotFactory from "../../src/factory/NodeSnapShotFactory";
import NodePublicKeyStorage from "../../src/entities/NodePublicKeyStorage";
import NodeSnapShotRepository from "../../src/repositories/NodeSnapShotRepository";

describe('test queries', () => {
    let container: Container;
    let kernel = new Kernel();
    let nodeSnapShotRepository: NodeSnapShotRepository;
    jest.setTimeout(60000); //slow integration tests

    beforeEach(async () => {
        await kernel.initializeContainer();
        container = kernel.container;
        nodeSnapShotRepository = container.get(NodeSnapShotRepository);
    })

    afterEach(async () => {
        await container.get(Connection).close();
    });

    test('findLatest', async () => {
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
        let initialDate = new Date();
        let snapshot1 = nodeSnapShotFactory.create(publicKeyStorage, node, initialDate);
        let otherNode = new Node('localhost2', 12345, 'b');
        let irrelevantSnapshot = nodeSnapShotFactory.create(new NodePublicKeyStorage(otherNode.publicKey!), otherNode, initialDate);
        await nodeSnapShotRepository.save([snapshot1, irrelevantSnapshot]);
        snapshot1.id = 1; //typeorm bug: doesn't update id...
        node.versionStr = 'v2';
        let updatedDate = new Date();
        let snapShot2 = nodeSnapShotFactory.createUpdatedSnapShot(snapshot1, node, updatedDate, null);
        await nodeSnapShotRepository.save([snapshot1, snapShot2]);
        let snapShots = await nodeSnapShotRepository.findLatest(publicKeyStorage);
        expect(snapShots.length).toEqual(2);
        expect(snapShots[0]!.nodeDetails!.versionStr).toEqual('v2');
        expect(snapShots[1]!.nodeDetails!.versionStr).toEqual('v1');

        snapShots = await nodeSnapShotRepository.findLatest(publicKeyStorage, initialDate);
        expect(snapShots.length).toEqual(1);
        expect(snapShots[0]!.nodeDetails!.versionStr).toEqual('v1');
    });
})
