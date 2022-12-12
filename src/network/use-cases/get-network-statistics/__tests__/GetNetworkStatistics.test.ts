import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { NetworkMeasurementRepository } from '../../../infrastructure/database/repositories/NetworkMeasurementRepository';
import { GetNetworkStatistics } from '../GetNetworkStatistics';

it('should capture and return errors', async function () {
	const repo = mock<NetworkMeasurementRepository>();
	repo.findBetween.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetworkStatistics = new GetNetworkStatistics(repo, exceptionLogger);
	const result = await getNetworkStatistics.execute({
		from: new Date(),
		to: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});
