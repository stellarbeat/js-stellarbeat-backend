import { OrganizationId } from './OrganizationId';
import Organization from './Organization';

export interface OrganizationRepository {
	findActive(at: Date): Promise<Organization[]>;
	findByOrganizationId(
		organizationId: OrganizationId
	): Promise<Organization | undefined>;
	findByHomeDomains(homeDomains: string[]): Promise<Organization[]>;
	save(organizations: Organization[], from: Date): Promise<Organization[]>;
}
