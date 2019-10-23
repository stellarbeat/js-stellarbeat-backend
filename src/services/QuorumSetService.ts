import {QuorumSet} from "@stellarbeat/js-stellar-domain";
import {Repository} from "typeorm";
import QuorumSetStorage from "../entities/QuorumSetStorage";

export default class QuorumSetService {
    protected quorumSetStorageRepository: Repository<QuorumSetStorage>;

    constructor(quorumSetStorageRepository: Repository<QuorumSetStorage>) {
        this.quorumSetStorageRepository = quorumSetStorageRepository;
    }

    async getStoredQuorumSetOrCreateNew(quorumSet: QuorumSet):Promise<QuorumSetStorage|undefined> {
        let quorumSetStorage = await this.quorumSetStorageRepository.findOne({'where': {hash: quorumSet.hashKey}});

        if(quorumSetStorage)
            return quorumSetStorage;

        quorumSetStorage = QuorumSetStorage.fromQuorumSet(quorumSet);
        if(!quorumSetStorage)
            return undefined;

        await this.quorumSetStorageRepository.save(quorumSetStorage);

        return quorumSetStorage;
    }
}