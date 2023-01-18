import { mock } from 'jest-mock-extended';
import { err, ok } from 'neverthrow';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetNetwork } from '../../get-network/GetNetwork';
import {
	Network,
	Node,
	Organization
} from '@stellarbeat/js-stellarbeat-shared';
import { GetOrganization } from '../GetOrganization';

it('should return org', async function () {
	const getNetwork = mock<GetNetwork>();
	getNetwork.execute.mockResolvedValue(
		ok(new Network([], [new Organization('a', 'b')]))
	);
	const exceptionLogger = mock<ExceptionLogger>();

	const getOrganization = new GetOrganization(getNetwork, exceptionLogger);
	const result = await getOrganization.execute({
		at: new Date(),
		organizationId: 'a'
	});
	expect(result.isErr()).toBe(false);
	if (result.isErr()) return;
	expect(result.value).toBeInstanceOf(Organization);
	expect(result.value?.id).toBe('a');
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
