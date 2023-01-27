import { OrganizationId } from '../OrganizationId';

it('should create organization id', function () {
	const organizationIdOrError = OrganizationId.create('test');
	expect(organizationIdOrError.isOk()).toBeTruthy();
	if (organizationIdOrError.isErr()) return;
	expect(organizationIdOrError.value.value).toEqual(
		'098f6bcd4621d373cade4e832627b4f6'
	);
});
