import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetNodeDayStatistics } from '../GetNodeDayStatistics';
import { createDummyPublicKeyString } from '../../../domain/__fixtures__/createDummyPublicKey';
import 'reflect-metadata';
import { NodeMeasurementDayRepository } from '../../../domain/measurement-aggregation/NodeMeasurementDayRepository';

it('should capture and return errors', async function () {
	const service = mock<NodeMeasurementDayRepository>();
	service.findBetween.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetworkStatistics = new GetNodeDayStatistics(
		service,
		exceptionLogger
	);
	const result = await getNetworkStatistics.execute({
		publicKey: createDummyPublicKeyString(),
		from: new Date(),
		to: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});

it('should return measurements', async function () {
	const service = mock<NodeMeasurementDayRepository>();
	service.findBetween.mockResolvedValue([]);
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetworkStatistics = new GetNodeDayStatistics(
		service,
		exceptionLogger
	);
	const result = await getNetworkStatistics.execute({
		publicKey: createDummyPublicKeyString(),
		from: new Date(),
		to: new Date()
	});
	expect(result.isOk()).toBe(true);
	if (result.isErr()) return;
	expect(result.value).toEqual([]);
});
