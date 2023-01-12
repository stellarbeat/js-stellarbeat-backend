import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { OrganizationId } from './OrganizationId';

/**
 * Stores the unique organization id's, regardless of versions.
 */
@Entity('organization')
export default class Organization {
	@PrimaryGeneratedColumn()
	id?: number;

	@Column(() => OrganizationId)
	organizationId: OrganizationId;

	@Column('text', { nullable: true })
	homeDomain: string | null = null;
	//null is allowed and value is not unique for backwards compatibility with older versions of stellarbeat

	@Column('timestamptz')
	dateDiscovered: Date;

	constructor(
		organizationId: OrganizationId,
		dateDiscovered: Date = new Date()
	) {
		this.organizationId = organizationId;
		this.dateDiscovered = dateDiscovered;
	}
}
