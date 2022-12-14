import { TrackedEntityId } from './TrackedEntityId';

export class OrganizationId implements TrackedEntityId {
	constructor(public readonly value: string) {}
}
