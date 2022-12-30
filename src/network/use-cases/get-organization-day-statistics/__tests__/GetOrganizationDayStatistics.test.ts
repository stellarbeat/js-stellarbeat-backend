import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetOrganizationDayStatistics } from '../GetOrganizationDayStatistics';
import { OrganizationMeasurementDayRepository } from '../../../domain/measurement-aggregation/OrganizationMeasurementDayRepository';

it('should capture and return errors', async function () {
	const service = mock<OrganizationMeasurementDayRepository>();
	service.findBetween.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const getNetworkStatistics = new GetOrganizationDayStatistics(
		service,
		exceptionLogger
	);
	const result = await getNetworkStatistics.execute({
		organizationId: 'a',
		from: new Date(),
		to: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});

it('should return measurements', async function () {
	const service = mock<OrganizationMeasurementDayRepository>();
	service.findBetween.mockResolvedValue([]);
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetOrganizationDayStatistics(service, exceptionLogger);
	const result = await useCase.execute({
		organizationId: 'a',
		from: new Date(),
		to: new Date()
	});
	expect(result.isOk()).toBe(true);
	if (result.isErr()) return;
	expect(result.value).toEqual([]);
});
