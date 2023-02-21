import { NodeDTOService } from '../NodeDTOService';
import { mock } from 'jest-mock-extended';
import { NodeMeasurementRepository } from '../../domain/node/NodeMeasurementRepository';
import { NodeMeasurementDayRepository } from '../../domain/node/NodeMeasurementDayRepository';
import Node from '../../domain/node/Node';
import { createDummyPublicKey } from '../../domain/node/__fixtures__/createDummyPublicKey';
import { createDummyOrganizationId } from '../../domain/organization/__fixtures__/createDummyOrganizationId';
import Organization from '../../domain/organization/Organization';
import { OrganizationValidators } from '../../domain/organization/OrganizationValidators';
import { NodeMeasurementAverage } from '../../domain/node/NodeMeasurementAverage';
import { NodeV1DTOMapper } from '../../mappers/NodeV1DTOMapper';

describe('NodeDTOService', () => {
	it('should return a list of NodeDTOs', async () => {
		const nodeMeasurementRepository = mock<NodeMeasurementRepository>();
		const nodeMeasurementDayRepository = mock<NodeMeasurementDayRepository>();
		const nodeMapper = mock<NodeV1DTOMapper>();
		const nodeDTOService = new NodeDTOService(
			nodeMeasurementRepository,
			nodeMeasurementDayRepository,
			nodeMapper
		);

		const time = new Date();
		const nodeA = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 1234
		});
		const nodeA24HourAvg = createNodeMeasurementAverage(
			nodeA.publicKey.value,
			1
		);
		const nodeA30DayAvg = createNodeMeasurementAverage(
			nodeA.publicKey.value,
			2
		);

		const nodeB = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 1235
		});
		const nodeB24HourAvg = createNodeMeasurementAverage(
			nodeB.publicKey.value,
			3
		);
		const nodeB30DayAvg = createNodeMeasurementAverage(
			nodeB.publicKey.value,
			4
		);

		const organization = Organization.create(
			createDummyOrganizationId(),
			'home',
			time
		);
		organization.updateValidators(
			new OrganizationValidators([nodeA.publicKey]),
			time
		);

		nodeMeasurementRepository.findXDaysAverageAt.mockResolvedValue([
			nodeA24HourAvg,
			nodeB24HourAvg
		]);
		nodeMeasurementDayRepository.findXDaysAverageAt.mockResolvedValue([
			nodeA30DayAvg,
			nodeB30DayAvg
		]);

		const nodeDTOsOrError = await nodeDTOService.getNodeDTOs(
			time,
			[nodeA, nodeB],
			[organization]
		);
		expect(nodeDTOsOrError.isOk()).toBe(true);
		expect(nodeMapper.toNodeV1DTO).toBeCalledTimes(2);
		expect(nodeMapper.toNodeV1DTO).toBeCalledWith(
			time,
			nodeA,
			nodeA24HourAvg,
			nodeA30DayAvg,
			organization.organizationId.value
		);
		expect(nodeMapper.toNodeV1DTO).toBeCalledWith(
			time,
			nodeB,
			nodeB24HourAvg,
			nodeB30DayAvg,
			undefined
		);
	});

	it('should return error if fetching 24H averages throws error', async function () {
		const nodeMeasurementRepository = mock<NodeMeasurementRepository>();
		nodeMeasurementRepository.findXDaysAverageAt.mockImplementation(() => {
			throw new Error('error');
		});
		const nodeMeasurementDayRepository = mock<NodeMeasurementDayRepository>();
		nodeMeasurementDayRepository.findXDaysAverageAt.mockResolvedValue([]);

		const nodeMapper = mock<NodeV1DTOMapper>();
		const nodeDTOService = new NodeDTOService(
			nodeMeasurementRepository,
			nodeMeasurementDayRepository,
			nodeMapper
		);

		const time = new Date();
		const nodeA = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 1234
		});

		const result = await nodeDTOService.getNodeDTOs(time, [nodeA], []);
		expect(result.isErr()).toBe(true);
	});

	it('should return error if fetching 30D averages throws error', async function () {
		const nodeMeasurementRepository = mock<NodeMeasurementRepository>();
		nodeMeasurementRepository.findXDaysAverageAt.mockResolvedValue([]);

		const nodeMeasurementDayRepository = mock<NodeMeasurementDayRepository>();
		nodeMeasurementDayRepository.findXDaysAverageAt.mockImplementation(() => {
			throw new Error('error');
		});

		const nodeMapper = mock<NodeV1DTOMapper>();
		const nodeDTOService = new NodeDTOService(
			nodeMeasurementRepository,
			nodeMeasurementDayRepository,
			nodeMapper
		);

		const time = new Date();
		const nodeA = Node.create(time, createDummyPublicKey(), {
			ip: 'localhost',
			port: 1234
		});

		const result = await nodeDTOService.getNodeDTOs(time, [nodeA], []);
		expect(result.isErr()).toBe(true);
	});

	function createNodeMeasurementAverage(
		publicKey: string,
		value: number
	): NodeMeasurementAverage {
		return {
			publicKey: publicKey,
			activeAvg: value,
			validatingAvg: value,
			historyArchiveErrorAvg: value,
			indexAvg: value,
			overLoadedAvg: value,
			fullValidatorAvg: value
		};
	}
});
