import NodeSnapShotRepository from "../../src/repositories/NodeSnapShotRepository";
import NodeSnapShot from "../../src/entities/NodeSnapShot";
import NodePublicKeyStorage from "../../src/entities/NodePublicKeyStorage";
import NodeSnapShotter from "../../src/services/SnapShotting/NodeSnapShotter";
let nodeSnapShotRepository = new NodeSnapShotRepository();


describe("findLatestSnapShots", () => {
    test("unknownPublicKeyShouldReturnEmptyResult", async () => {
        let publicKeyStorageRepository = {findOne: () => undefined};
        let nodeSnapShotter = new NodeSnapShotter(nodeSnapShotRepository, {} as any, publicKeyStorageRepository as any, {} as any);
        let snapShots = await nodeSnapShotter.findLatestSnapShots('a', new Date());
        expect(snapShots.length).toEqual(0);
    });

    test("itShouldReturnSnapShots", async () => {
        let publicKeyStorage = new NodePublicKeyStorage('a');
        let publicKeyStorageRepository = {findOne: () => publicKeyStorage};
        let nodeSnapShotter = new NodeSnapShotter(nodeSnapShotRepository, {} as any, publicKeyStorageRepository as any, {} as any);
        let date = new Date();
        let snapShot = new NodeSnapShot(publicKeyStorage, date, 'localhost', 1234);
        jest.spyOn(nodeSnapShotRepository, 'findLatest').mockResolvedValue([snapShot]);
        let snapShots = await nodeSnapShotter.findLatestSnapShots('a', new Date());
        expect(snapShots.length).toEqual(1);
    });
});