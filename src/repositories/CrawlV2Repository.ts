import { EntityRepository, Repository } from 'typeorm';
import CrawlV2 from '../entities/CrawlV2';
import { injectable } from 'inversify';

@injectable()
@EntityRepository(CrawlV2)
export class CrawlV2Repository extends Repository<CrawlV2> {
	async findLatest() {
		return await this.findOne({
			where: {
				completed: true
			}
		});
	}
}
