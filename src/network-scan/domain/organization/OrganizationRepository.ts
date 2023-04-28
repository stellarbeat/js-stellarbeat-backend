import Organization from './Organization';

//active means that the organization is not archived. i.e. snapshot endDate = SNAPSHOT_MAX_END_DATE
export interface OrganizationRepository {
	findActiveAtTimePoint(at: Date): Promise<Organization[]>; //active snapshot at time x
	findActive(): Promise<Organization[]>; //active snapshot at time now
	findByHomeDomains(homeDomains: string[]): Promise<Organization[]>; //active or archived
	save(organizations: Organization[], from: Date): Promise<Organization[]>;
}
