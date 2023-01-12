import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetMeasurements } from '../GetMeasurements';
import { NodeMeasurementRepository } from '../../../domain/node/NodeMeasurementRepository';

it('should capture and return errors', async function () {
	const service = mock<NodeMeasurementRepository>();
	service.findBetween.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetworkStatistics = new GetMeasurements(service, exceptionLogger);
	const result = await getNetworkStatistics.execute({
		id: 'a',
		from: new Date(),
		to: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});

it('should return measurements', async function () {
	const service = mock<NodeMeasurementRepository>();
	service.findBetween.mockResolvedValue([]);
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetworkStatistics = new GetMeasurements(service, exceptionLogger);
	const result = await getNetworkStatistics.execute({
		id: 'a',
		from: new Date(),
		to: new Date()
	});
	expect(result.isOk()).toBe(true);
	if (result.isErr()) return;
	expect(result.value).toEqual([]);
});
