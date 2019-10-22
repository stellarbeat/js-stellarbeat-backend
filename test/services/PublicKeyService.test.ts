import PublicKeyService from '../../src/services/PublicKeyService';
import {PublicKey} from "@stellarbeat/js-stellar-domain";
import PublicKeyStorage from "../../src/entities/PublicKeyStorage";

describe("getStoredPublicKeyOrCreateNew", () => {
    test('publicKeyFound', async () => {
        let publicKey:PublicKey = 'a';
        let repositoryMock = {
            findOne: jest.fn(() => new PublicKeyStorage('a')),
            save: jest.fn(() => true)

        };
        let publicKeyService = new PublicKeyService(repositoryMock as any);

        expect(await publicKeyService.getStoredPublicKeyOrCreateNew(publicKey)).toEqual(new PublicKeyStorage(publicKey));
        expect(repositoryMock.findOne).toBeCalledTimes(1);
        expect(repositoryMock.save).toBeCalledTimes(0);
    });
    test('publicKeyNotFound', async () => {
        let publicKey:PublicKey = 'a';
        let repositoryMock = {
            findOne: jest.fn().mockReturnValue(undefined),
            save: jest.fn()
        };
        let publicKeyService = new PublicKeyService(repositoryMock as any);

        expect(await publicKeyService.getStoredPublicKeyOrCreateNew(publicKey)).toEqual(new PublicKeyStorage(publicKey));
        expect(repositoryMock.findOne).toBeCalledTimes(1);
        expect(repositoryMock.save).toBeCalledTimes(1);
        expect(repositoryMock.save).toBeCalledWith(new PublicKeyStorage('a'));
    });
});
