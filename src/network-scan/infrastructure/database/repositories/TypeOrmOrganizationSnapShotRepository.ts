import { Equal, LessThanOrEqual, Repository } from 'typeorm';
import OrganizationSnapShot from '../../../domain/organization/OrganizationSnapShot';
import { injectable } from 'inversify';
import { OrganizationSnapShotRepository } from '../../../domain/organization/OrganizationSnapShotRepository';
import { OrganizationId } from '../../../domain/organization/OrganizationId';

@injectable()
export default class TypeOrmOrganizationSnapShotRepository
	implements OrganizationSnapShotRepository
{
	constructor(private baseRepository: Repository<OrganizationSnapShot>) {}

	async findLatestByOrganizationId(
		organizationId: OrganizationId,
		at: Date = new Date()
	) {
		return await this.baseRepository.find({
			relations: ['_organization'],
			where: [
				{
					_organization: {
						organizationId: {
							value: Equal(organizationId.value)
						}
					},
					startDate: LessThanOrEqual(at)
				}
			],
			take: 10,
			order: {
				endDate: 'DESC'
			}
		});
	}

	async findLatest(at: Date = new Date()) {
		return await this.baseRepository.find({
			where: {
				startDate: LessThanOrEqual(at)
			},
			take: 10,
			order: {
				startDate: 'DESC'
			}
		});
	}
}
