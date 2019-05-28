import {EntityRepository, Repository} from "typeorm";
import NodeMeasurement from "../entities/NodeMeasurement";

@EntityRepository(NodeMeasurement)
export class NodeMeasurementRepository extends Repository<NodeMeasurement> {

    findByTime(time: Date) {
        return this.findOne({ time });
    }

    findActivityValidatingAndLoadCountLatestXDays(days:number) {
        return this.createQueryBuilder()
            .select('"publicKey", sum("isActive"::int) as activeCount, sum("isValidating"::int) as validatingCount, sum("isOverLoaded"::int) as overLoadedCount')
            .where("time >= current_date - interval \'" +  days + "\' day")
            .groupBy('"publicKey"')
            .getRawMany()
    }
}