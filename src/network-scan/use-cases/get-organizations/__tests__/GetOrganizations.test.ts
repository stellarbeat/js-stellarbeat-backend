import { mock } from 'jest-mock-extended';
import { err, ok } from 'neverthrow';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetNetwork } from '../../get-network/GetNetwork';
import { GetOrganizations } from '../GetOrganizations';
import { createDummyNetworkV1 } from '../../../services/__fixtures__/createDummyNetworkV1';
import { createDummyOrganizationV1 } from '../../../services/__fixtures__/createDummyOrganizationV1';

it('should return orgs', async function () {
	const getNetwork = mock<GetNetwork>();
	const network = createDummyNetworkV1();
	const organization = createDummyOrganizationV1();
	network.organizations.push(organization);
	getNetwork.execute.mockResolvedValue(ok(network));
	const exceptionLogger = mock<ExceptionLogger>();

	const getOrganizations = new GetOrganizations(getNetwork, exceptionLogger);
	const result = await getOrganizations.execute({ at: new Date() });
	expect(result.isErr()).toBe(false);
	if (result.isErr()) return;
	expect(result.value).toHaveLength(1);
});

it('should return no orgs if no network is found', async function () {
	const getNetwork = mock<GetNetwork>();
	getNetwork.execute.mockResolvedValue(ok(null));
	const exceptionLogger = mock<ExceptionLogger>();

	const getOrganizations = new GetOrganizations(getNetwork, exceptionLogger);
	const result = await getOrganizations.execute({ at: new Date() });
	expect(result.isErr()).toBe(false);
	if (result.isErr()) return;
	expect(result.value).toHaveLength(0);
});

it('should return error if getNetwork fails', async function () {
	const getNetwork = mock<GetNetwork>();
	getNetwork.execute.mockResolvedValue(err(new Error('test')));
	const exceptionLogger = mock<ExceptionLogger>();

	const getOrganizations = new GetOrganizations(getNetwork, exceptionLogger);
	const result = await getOrganizations.execute({ at: new Date() });
	expect(result.isErr()).toBe(true);
});
