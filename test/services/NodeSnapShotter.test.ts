import NodeSnapShotRepository from "../../src/repositories/NodeSnapShotRepository";
import NodeSnapShot from "../../src/entities/NodeSnapShot";
import NodePublicKeyStorage from "../../src/entities/NodePublicKeyStorage";
import NodeSnapShotter from "../../src/services/SnapShotting/NodeSnapShotter";
const nodeSnapShotRepository = new NodeSnapShotRepository();


describe("findLatestSnapShotsByNode", () => {
    test("unknownPublicKeyShouldReturnEmptyResult", async () => {
        const publicKeyStorageRepository = {findOne: () => undefined};
        const nodeSnapShotter = new NodeSnapShotter(nodeSnapShotRepository, {} as any, publicKeyStorageRepository as any, {} as any);
        const snapShots = await nodeSnapShotter.findLatestSnapShotsByNode('a', new Date());
        expect(snapShots.length).toEqual(0);
    });

    test("itShouldReturnSnapShots", async () => {
        const publicKeyStorage = new NodePublicKeyStorage('a');
        const publicKeyStorageRepository = {findOne: () => publicKeyStorage};
        const nodeSnapShotter = new NodeSnapShotter(nodeSnapShotRepository, {} as any, publicKeyStorageRepository as any, {} as any);
        const date = new Date();
        const snapShot = new NodeSnapShot(publicKeyStorage, date, 'localhost', 1234);
        jest.spyOn(nodeSnapShotRepository, 'findLatestByNode').mockResolvedValue([snapShot]);
        const snapShots = await nodeSnapShotter.findLatestSnapShotsByNode('a', new Date());
        expect(snapShots.length).toEqual(1);
    });
});