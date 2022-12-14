import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetNodeStatistics } from '../GetNodeStatistics';
import NodeMeasurementService from '../../../infrastructure/services/NodeMeasurementService';
import { ok } from 'neverthrow';

it('should capture and return errors', async function () {
	const service = mock<NodeMeasurementService>();
	service.getNodeMeasurements.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetworkStatistics = new GetNodeStatistics(service, exceptionLogger);
	const result = await getNetworkStatistics.execute({
		publicKey: 'a',
		from: new Date(),
		to: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});

it('should return measurements', async function () {
	const service = mock<NodeMeasurementService>();
	service.getNodeMeasurements.mockResolvedValue([]);
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetworkStatistics = new GetNodeStatistics(service, exceptionLogger);
	const result = await getNetworkStatistics.execute({
		publicKey: 'a',
		from: new Date(),
		to: new Date()
	});
	expect(result.isOk()).toBe(true);
	if (result.isErr()) return;
	expect(result.value).toEqual([]);
});
