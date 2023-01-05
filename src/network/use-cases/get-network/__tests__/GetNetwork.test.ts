import { GetNetwork } from '../GetNetwork';
import { mock } from 'jest-mock-extended';
import { err } from 'neverthrow';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { NetworkReadRepository } from '../../../domain/NetworkReadRepository';

it('should capture and return network errors', async function () {
	const networkRepo = mock<NetworkReadRepository>();
	networkRepo.getNetwork.mockResolvedValue(err(new Error('test')));
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetwork = new GetNetwork(networkRepo, exceptionLogger);
	const result = await getNetwork.execute({ at: new Date() });
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});
