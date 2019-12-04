import NodeStorageV2Repository from "../repositories/NodeStorageV2Repository";

export default class NodeStorageV2Service {
    protected nodeStorageV2RepositoryRepository: NodeStorageV2Repository;

    constructor(nodeStorageV2Repository: NodeStorageV2Repository) {
        this.nodeStorageV2RepositoryRepository = nodeStorageV2Repository;
    }



    /*async getStoredNodeOrCreateNew(publicKey: PublicKey) {
        let nodeStorage = await this.publicKeyStorageRepository.findOne({'where': {publicKey: publicKey}});

        if (!nodeStorage) {
            nodeStorage = new NodeStorageV2(publicKey);
            await this.publicKeyStorageRepository.save(nodeStorage);
        }

        return nodeStorage;
    }*/
}