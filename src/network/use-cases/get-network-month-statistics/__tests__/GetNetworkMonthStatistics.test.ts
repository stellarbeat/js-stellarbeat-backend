import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { NetworkMeasurementMonthRepository } from '../../../infrastructure/database/repositories/NetworkMeasurementMonthRepository';
import { GetNetworkMonthStatistics } from '../GetNetworkMonthStatistics';

it('should capture and return errors', async function () {
	const repo = mock<NetworkMeasurementMonthRepository>();
	repo.findBetween.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetworkMonthStatistics = new GetNetworkMonthStatistics(
		repo,
		exceptionLogger
	);
	const result = await getNetworkMonthStatistics.execute({
		from: new Date(),
		to: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});
