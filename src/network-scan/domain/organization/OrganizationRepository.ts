import { OrganizationId } from './OrganizationId';
import Organization from './Organization';

export interface OrganizationRepository {
	findByOrganizationId(
		organizationId: OrganizationId
	): Promise<Organization | undefined>;
	save(versionedOrganization: Organization): Promise<void>;
	save(versionedOrganizations: Organization[]): Promise<void>;
}
