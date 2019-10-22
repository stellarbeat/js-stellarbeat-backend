import PublicKeyStorage from "../entities/PublicKeyStorage";
import {PublicKey} from "@stellarbeat/js-stellar-domain";
import {Repository} from "typeorm";

export default class PublicKeyService {
    protected publicKeyStorageRepository: Repository<PublicKeyStorage>;

    constructor(publicKeyStorageRepository: Repository<PublicKeyStorage>) {
        this.publicKeyStorageRepository = publicKeyStorageRepository;
    }

    async getStoredPublicKeyOrCreateNew(publicKey: PublicKey) {
        let publicKeyStorage = await this.publicKeyStorageRepository.findOne({'where': {publicKey: publicKey}});

        if (!publicKeyStorage) {
            publicKeyStorage = new PublicKeyStorage(publicKey);
            await this.publicKeyStorageRepository.save(publicKeyStorage);
        }

        return publicKeyStorage;
    }
}