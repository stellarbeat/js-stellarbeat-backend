import { EntityRepository, Repository } from 'typeorm';
import NodeMeasurementRollup from '../entities/NodeMeasurementRollup';

//https://www.citusdata.com/blog/2018/06/14/scalable-incremental-data-aggregation/
@EntityRepository(NodeMeasurementRollup)
export class NodeMeasurementRollupRepository extends Repository<NodeMeasurementRollup> {
	async findByName(name: string) {
		return await this.findOne({
			where: {
				name: name
			}
		});
	}
}
