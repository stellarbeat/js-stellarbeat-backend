import { mock } from 'jest-mock-extended';
import { OrganizationMeasurementRepository } from '../../domain/organization/OrganizationMeasurementRepository';
import { OrganizationMeasurementDayRepository } from '../../domain/organization/OrganizationMeasurementDayRepository';
import { OrganizationDTOService } from '../OrganizationDTOService';
import Organization from '../../domain/organization/Organization';
import { createDummyOrganizationId } from '../../domain/organization/__fixtures__/createDummyOrganizationId';
import { OrganizationMeasurementAverage } from '../../domain/organization/OrganizationMeasurementAverage';
import { OrganizationV1DTOMapper } from '../../mappers/OrganizationV1DTOMapper';

describe('OrganizationDTOService', () => {
	it('should return a list of OrganizationDTOs', async () => {
		const organizationMeasurementRepository =
			mock<OrganizationMeasurementRepository>();
		const organizationMeasurementDayRepository =
			mock<OrganizationMeasurementDayRepository>();
		const organizationMapper = mock<OrganizationV1DTOMapper>();

		const organizationDTOService = new OrganizationDTOService(
			organizationMeasurementRepository,
			organizationMeasurementDayRepository,
			organizationMapper
		);

		const time = new Date();
		const organizationA = Organization.create(
			createDummyOrganizationId(),
			'home',
			time
		);
		const organizationA24HourAvg = createOrganizationMeasurementAverage(
			organizationA.organizationId.value
		);
		const organizationA30DayAvg = createOrganizationMeasurementAverage(
			organizationA.organizationId.value
		);

		const organizationB = Organization.create(
			createDummyOrganizationId(),
			'work',
			time
		);
		const organizationB24HourAvg = createOrganizationMeasurementAverage(
			organizationB.organizationId.value
		);
		const organizationB30DayAvg = createOrganizationMeasurementAverage(
			organizationB.organizationId.value
		);

		organizationMeasurementRepository.findXDaysAverageAt.mockResolvedValue([
			organizationA24HourAvg,
			organizationB24HourAvg
		]);
		organizationMeasurementDayRepository.findXDaysAverageAt.mockResolvedValue([
			organizationA30DayAvg,
			organizationB30DayAvg
		]);

		const result = await organizationDTOService.getOrganizationDTOs(time, [
			organizationA,
			organizationB
		]);

		expect(result.isOk()).toBe(true);
		expect(organizationMapper.toOrganizationV1DTO).toHaveBeenCalledTimes(2);
		expect(organizationMapper.toOrganizationV1DTO).toHaveBeenCalledWith(
			organizationA,
			organizationA24HourAvg,
			organizationA30DayAvg
		);
		expect(organizationMapper.toOrganizationV1DTO).toHaveBeenCalledWith(
			organizationB,
			organizationB24HourAvg,
			organizationB30DayAvg
		);
	});

	it('should return an error if the 24 hour average fails', async () => {
		const organizationMeasurementRepository =
			mock<OrganizationMeasurementRepository>();
		const organizationMeasurementDayRepository =
			mock<OrganizationMeasurementDayRepository>();
		const organizationMapper = mock<OrganizationV1DTOMapper>();

		const organizationDTOService = new OrganizationDTOService(
			organizationMeasurementRepository,
			organizationMeasurementDayRepository,
			organizationMapper
		);

		const time = new Date();
		const organizationA = Organization.create(
			createDummyOrganizationId(),
			'home',
			time
		);

		organizationMeasurementRepository.findXDaysAverageAt.mockRejectedValue(
			new Error('test error')
		);
		organizationMeasurementDayRepository.findXDaysAverageAt.mockResolvedValue(
			[]
		);

		const result = await organizationDTOService.getOrganizationDTOs(time, [
			organizationA
		]);

		expect(result.isErr()).toBe(true);
		expect(organizationMapper.toOrganizationV1DTO).not.toHaveBeenCalled();
	});

	it('should return an error if the 30 day average fails', async () => {
		const organizationMeasurementRepository =
			mock<OrganizationMeasurementRepository>();
		const organizationMeasurementDayRepository =
			mock<OrganizationMeasurementDayRepository>();
		const organizationMapper = mock<OrganizationV1DTOMapper>();

		const organizationDTOService = new OrganizationDTOService(
			organizationMeasurementRepository,
			organizationMeasurementDayRepository,
			organizationMapper
		);

		const time = new Date();
		const organizationA = Organization.create(
			createDummyOrganizationId(),
			'home',
			time
		);

		organizationMeasurementRepository.findXDaysAverageAt.mockResolvedValue([]);
		organizationMeasurementDayRepository.findXDaysAverageAt.mockRejectedValue(
			new Error('test error')
		);

		const result = await organizationDTOService.getOrganizationDTOs(time, [
			organizationA
		]);

		expect(result.isErr()).toBe(true);
		expect(organizationMapper.toOrganizationV1DTO).not.toHaveBeenCalled();
	});

	function createOrganizationMeasurementAverage(
		organizationId: string
	): OrganizationMeasurementAverage {
		return {
			organizationId: organizationId,
			isSubQuorumAvailableAvg: 1
		};
	}
});
