import { mock } from 'jest-mock-extended';
import { err, ok } from 'neverthrow';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetNetwork } from '../../get-network/GetNetwork';
import { GetOrganization } from '../GetOrganization';
import { createDummyNetworkV1 } from '../../../services/__fixtures__/createDummyNetworkV1';
import { createDummyOrganizationV1 } from '../../../services/__fixtures__/createDummyOrganizationV1';

it('should return org', async function () {
	const getNetwork = mock<GetNetwork>();
	const network = createDummyNetworkV1();
	const organization = createDummyOrganizationV1();
	network.organizations.push(organization);
	getNetwork.execute.mockResolvedValue(ok(network));
	const exceptionLogger = mock<ExceptionLogger>();

	const getOrganization = new GetOrganization(getNetwork, exceptionLogger);
	const result = await getOrganization.execute({
		at: new Date(),
		organizationId: organization.id
	});
	expect(result.isErr()).toBe(false);
	if (result.isErr()) return;
	expect(result.value?.id).toBe(organization.id);
});

it('should return no org if no network is found', async function () {
	const getNetwork = mock<GetNetwork>();
	getNetwork.execute.mockResolvedValue(ok(null));
	const exceptionLogger = mock<ExceptionLogger>();

	const getOrganization = new GetOrganization(getNetwork, exceptionLogger);
	const result = await getOrganization.execute({
		at: new Date(),
		organizationId: 'a'
	});
	expect(result.isErr()).toBe(false);
	if (result.isErr()) return;
	expect(result.value).toEqual(null);
});

it('should return error if retrieving network fails', async function () {
	const getNetwork = mock<GetNetwork>();
	getNetwork.execute.mockResolvedValue(err(new Error('test')));
	const exceptionLogger = mock<ExceptionLogger>();

	const getOrganization = new GetOrganization(getNetwork, exceptionLogger);
	const result = await getOrganization.execute({
		at: new Date(),
		organizationId: 'a'
	});
	expect(result.isErr()).toBe(true);
});
