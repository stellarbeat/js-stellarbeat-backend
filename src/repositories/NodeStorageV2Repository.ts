import {EntityRepository, Repository} from "typeorm";
import {PublicKey} from "@stellarbeat/js-stellar-domain";
import NodeStorageV2 from "../entities/NodeStorageV2";

@EntityRepository(NodeStorageV2)
export default class NodeStorageV2Repository extends Repository<NodeStorageV2> {

    async findByPublicKeyWithLatestSnapShot(publicKey: PublicKey): Promise<NodeStorageV2|undefined> {
        return await this.createQueryBuilder('node_v2')
            .leftJoinAndMapOne('node_v2.latestSnapShot', 'node_v2.snapShots', 'node_snap_shot', 'node_snap_shot.current is true')
            .where("publicKey = :publicKey", {publicKey: publicKey})
            .getOne()
    }
}