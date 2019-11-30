import {EntityRepository, Repository} from "typeorm";
import NodeSnapShot from "../entities/NodeSnapShot";
import {PublicKey} from "@stellarbeat/js-stellar-domain";

@EntityRepository(NodeSnapShot)
export default class NodeSnapShotRepository extends Repository<NodeSnapShot> {

    async findLatest(): Promise<NodeSnapShot[]> {
        return await this.createQueryBuilder()
            .where("crawlEnd is null")
            .getMany();
    }

    async findLatestByPublicKey(publicKey: PublicKey): Promise<NodeSnapShot|undefined> {
        return await this.createQueryBuilder()
            .where("publicKey = :publicKey", {publicKey: publicKey})
            .andWhere("crawlEnd is null")
            .getOne()
    }
}