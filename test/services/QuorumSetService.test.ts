import {QuorumSet} from "@stellarbeat/js-stellar-domain";
import QuorumSetStorage from "../../src/entities/QuorumSetStorage";
import QuorumSetService from "../../src/services/QuorumSetService";

describe("getStoredQuorumSetOrCreateNew", () => {
    test('quorumSetFound', async () => {
        let quorumSet:QuorumSet = new QuorumSet();
        let repositoryMock = {
            findOne: jest.fn(() => new QuorumSetStorage(quorumSet.hashKey, quorumSet)),
            save: jest.fn(() => true)

        };
        let quorumSetService = new QuorumSetService(repositoryMock as any);

        expect(await quorumSetService.getStoredQuorumSetOrCreateNew(quorumSet)).toEqual(new QuorumSetStorage(quorumSet.hashKey, quorumSet));
        expect(repositoryMock.findOne).toBeCalledTimes(1);
        expect(repositoryMock.save).toBeCalledTimes(0);
    });
    test('quorumSetNotFound', async () => {
        let quorumSet:QuorumSet = new QuorumSet();
        quorumSet.validators.push('a');

        let repositoryMock = {
            findOne: jest.fn().mockReturnValue(undefined),
            save: jest.fn(() => true)
        };
        let quorumSetService = new QuorumSetService(repositoryMock as any);

        expect(await quorumSetService.getStoredQuorumSetOrCreateNew(quorumSet)).toEqual(new QuorumSetStorage(quorumSet.hashKey, quorumSet));
        expect(repositoryMock.findOne).toBeCalledTimes(1);
        expect(repositoryMock.save).toBeCalledTimes(1);
    });
});
