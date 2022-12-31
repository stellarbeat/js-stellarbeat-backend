import { OrganizationId } from '../OrganizationId';

it('should create organization id', function () {
	const organizationIdOrError = OrganizationId.create('test');
	expect(organizationIdOrError.isOk()).toBeTruthy();
	if (organizationIdOrError.isErr()) return;
	expect(organizationIdOrError.value.value).toEqual('test');
});

it('should not create organization id with invalid length', function () {
	const organizationIdOrError = OrganizationId.create('x'.repeat(101));
	expect(organizationIdOrError.isErr()).toBeTruthy();
	const validOrganizationIdOrError = OrganizationId.create('x'.repeat(100));
	expect(validOrganizationIdOrError.isOk()).toBeTruthy();
});
