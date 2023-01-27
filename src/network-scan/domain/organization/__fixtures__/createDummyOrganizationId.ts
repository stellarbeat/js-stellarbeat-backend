import { OrganizationId } from '../OrganizationId';

export function createDummyOrganizationId(
	domain = createDummyOrganizationIdString()
) {
	const organizationIdOrError = OrganizationId.create(domain);
	if (organizationIdOrError.isErr()) throw organizationIdOrError.error;
	return organizationIdOrError.value;
}

export function createDummyOrganizationIdString() {
	let organizationId = '';
	const allowedChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	for (let i = 0; i < 55; i++) {
		organizationId += allowedChars.charAt(
			Math.floor(Math.random() * allowedChars.length)
		);
	}

	return organizationId;
}
