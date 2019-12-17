import {EntityRepository, Repository} from "typeorm";
import NodeSnapShot from "../entities/NodeSnapShot";
import { IsNull } from "typeorm";
import {PublicKey} from "@stellarbeat/js-stellar-domain";

@EntityRepository(NodeSnapShot)
export default class NodeSnapShotRepository extends Repository<NodeSnapShot> {

    /**
     * With endCrawl null
     */
    async findActive(): Promise<NodeSnapShot[]> {
        return await this.find({where: {endCrawl: IsNull()}});
    }

    async findLatestByPublicKey(publicKey: PublicKey): Promise<NodeSnapShot | undefined> {
        return await this.createQueryBuilder('node_snap_shot')
            .innerJoinAndSelect("node_snap_shot.nodeStorage", "node_storage","node_storage.publicKey = :publicKey", {publicKey: publicKey} )
            .leftJoinAndSelect("node_snap_shot.quorumSet", "quorum_set")
            .leftJoinAndSelect("node_snap_shot.nodeDetails", "node_details")
            .leftJoinAndSelect("node_snap_shot.geoData", "geo_data")
            .leftJoinAndSelect("node_snap_shot.startCrawl", "crawl_v2_start")
            .leftJoinAndSelect("node_snap_shot.endCrawl", "crawl_v2_end")
            .where('current = true')
            .getOne()
    }
}