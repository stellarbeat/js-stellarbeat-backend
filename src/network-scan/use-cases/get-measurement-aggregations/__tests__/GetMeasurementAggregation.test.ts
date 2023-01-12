import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { MeasurementAggregationRepositoryFactory } from '../../../domain/measurement-aggregation/MeasurementAggregationRepositoryFactory';
import { GetMeasurementAggregations } from '../GetMeasurementAggregations';
import {
	AggregationTarget,
	GetMeasurementAggregationsDTO
} from '../GetMeasurementAggregationsDTO';
import NodeMeasurementDay from '../../../domain/node/NodeMeasurementDay';
import NetworkMeasurementDay from '../../../domain/network/NetworkMeasurementDay';
import OrganizationMeasurementDay from '../../../domain/organization/OrganizationMeasurementDay';
import NetworkMeasurementMonth from '../../../domain/network/NetworkMeasurementMonth';
import { MeasurementAggregationRepository } from '../../../domain/measurement-aggregation/MeasurementAggregationRepository';
import { MeasurementAggregation } from '../../../domain/measurement-aggregation/MeasurementAggregation';

it('should call the right repo', function () {
	const factory = mock<MeasurementAggregationRepositoryFactory>();
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetMeasurementAggregations(factory, exceptionLogger);
	const dto: GetMeasurementAggregationsDTO = {
		id: 'id',
		aggregationTarget: AggregationTarget.NodeDay,
		from: new Date(),
		to: new Date()
	};
	useCase.execute(dto);
	expect(factory.createFor).toBeCalledTimes(1);
	expect(factory.createFor).toBeCalledWith(NodeMeasurementDay);

	factory.createFor.mockClear();
	dto.aggregationTarget = AggregationTarget.NetworkDay;
	useCase.execute(dto);
	expect(factory.createFor).toBeCalledTimes(1);
	expect(factory.createFor).toBeCalledWith(NetworkMeasurementDay);

	factory.createFor.mockClear();
	dto.aggregationTarget = AggregationTarget.OrganizationDay;
	useCase.execute(dto);
	expect(factory.createFor).toBeCalledTimes(1);
	expect(factory.createFor).toBeCalledWith(OrganizationMeasurementDay);

	factory.createFor.mockClear();
	dto.aggregationTarget = AggregationTarget.NetworkMonth;
	useCase.execute(dto);
	expect(factory.createFor).toBeCalledTimes(1);
	expect(factory.createFor).toBeCalledWith(NetworkMeasurementMonth);
});

it('should capture and return errors', async function () {
	const repo = mock<MeasurementAggregationRepository<MeasurementAggregation>>();
	const factory = mock<MeasurementAggregationRepositoryFactory>();
	repo.findBetween.mockReturnValue(Promise.reject(new Error('test')));
	factory.createFor.mockReturnValue(repo);
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetMeasurementAggregations(factory, exceptionLogger);
	const result = await useCase.execute({
		id: 'id',
		aggregationTarget: AggregationTarget.NetworkMonth,
		from: new Date(),
		to: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});

it('should return measurement aggregations', async function () {
	const repo = mock<MeasurementAggregationRepository<MeasurementAggregation>>();
	const factory = mock<MeasurementAggregationRepositoryFactory>();
	repo.findBetween.mockReturnValue(Promise.resolve([]));
	factory.createFor.mockReturnValue(repo);
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetMeasurementAggregations(factory, exceptionLogger);
	const result = await useCase.execute({
		id: 'id',
		aggregationTarget: AggregationTarget.NetworkMonth,
		from: new Date(),
		to: new Date()
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) throw result.error;
	expect(result.value).toEqual([]);
});

it('should map to correct return DTO', function () {
	//todo
});
