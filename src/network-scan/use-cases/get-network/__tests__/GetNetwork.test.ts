import { GetNetwork } from '../GetNetwork';
import { mock } from 'jest-mock-extended';
import { err } from 'neverthrow';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { NetworkDTOService } from '../../../services/NetworkDTOService';
import { CachedNetworkDTOService } from '../../../services/CachedNetworkDTOService';

it('should capture and return network errors', async function () {
	const networkDTOService = mock<CachedNetworkDTOService>();
	networkDTOService.getNetworkDTOAt.mockResolvedValue(err(new Error('test')));
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetwork = new GetNetwork(networkDTOService, exceptionLogger);
	const result = await getNetwork.execute({ at: new Date() });
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});
