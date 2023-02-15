import OrganizationSnapShot from './OrganizationSnapShot';
import { OrganizationId } from './OrganizationId';

//We need this until we start storing the actual changes. The only reason we need this is to calculate changes on the fly
//@deprecated
export interface OrganizationSnapShotRepository {
	findLatest(at: Date): Promise<OrganizationSnapShot[]>;
	findLatestByOrganizationId(
		organizationId: OrganizationId,
		at: Date
	): Promise<OrganizationSnapShot[]>;
}
