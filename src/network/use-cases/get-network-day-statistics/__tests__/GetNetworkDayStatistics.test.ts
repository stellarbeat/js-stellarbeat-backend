import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { TypeOrmNetworkMeasurementDayRepository } from '../../../infrastructure/database/repositories/TypeOrmNetworkMeasurementDayRepository';
import { GetNetworkDayStatistics } from '../GetNetworkDayStatistics';

it('should capture and return errors', async function () {
	const repo = mock<TypeOrmNetworkMeasurementDayRepository>();
	repo.findBetween.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetworkDayStatistics = new GetNetworkDayStatistics(
		repo,
		exceptionLogger
	);
	const result = await getNetworkDayStatistics.execute({
		from: new Date(),
		to: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});
