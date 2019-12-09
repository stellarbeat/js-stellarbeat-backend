import {EntityRepository, Repository} from "typeorm";
import NodeSnapShot from "../entities/NodeSnapShot";

@EntityRepository(NodeSnapShot)
export default class NodeSnapShotRepository extends Repository<NodeSnapShot> {

    async findLatest(): Promise<NodeSnapShot[]> {
        return await this.createQueryBuilder('node_snap_shot')
            .leftJoinAndSelect('node_snap_shot.nodeStorage', 'node_v2')
            .leftJoinAndSelect('node_snap_shot.nodeDetails', 'node_details')
            .leftJoinAndSelect('node_snap_shot.quorumSet', 'quorum_set')
            .leftJoinAndSelect('node_snap_shot.geoData', 'geo_data')
            .where("node_snap_shot.endDate = :endDate", {endDate: NodeSnapShot.MAX_DATE.toISOString()})
            .getMany();
    }
}