import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import 'reflect-metadata';
import { NetworkId } from '../../domain/network/NetworkId';
import { MeasurementAggregation } from '../../domain/measurement-aggregation/MeasurementAggregation';
import {
	AggregationTarget,
	GetMeasurementAggregationsDTO
} from './GetMeasurementAggregationsDTO';
import NetworkMeasurementDay from '../../domain/network/NetworkMeasurementDay';
import { MeasurementAggregationRepository } from '../../domain/measurement-aggregation/MeasurementAggregationRepository';
import NetworkMeasurementMonth from '../../domain/network/NetworkMeasurementMonth';
import NodeMeasurementDay from '../../domain/node/NodeMeasurementDay';
import OrganizationMeasurementDay from '../../domain/organization/OrganizationMeasurementDay';
import { MeasurementAggregationRepositoryFactory } from '../../domain/measurement-aggregation/MeasurementAggregationRepositoryFactory';
import { MeasurementAggregationSourceId } from '../../domain/measurement-aggregation/MeasurementAggregationSourceId';
import PublicKey from '../../domain/node/PublicKey';
import { OrganizationId } from '../../domain/organization/OrganizationId';

@injectable()
export class GetMeasurementAggregations {
	constructor(
		private repoFactory: MeasurementAggregationRepositoryFactory,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetMeasurementAggregationsDTO
	): Promise<Result<MeasurementAggregation[], Error>> {
		try {
			let repo:
				| MeasurementAggregationRepository<MeasurementAggregation>
				| undefined;
			let idOrError: Result<MeasurementAggregationSourceId, Error> | undefined;

			switch (dto.aggregationTarget) {
				case AggregationTarget.NetworkDay:
					repo = this.repoFactory.createFor(NetworkMeasurementDay);
					idOrError = ok(new NetworkId(dto.id));
					break;
				case AggregationTarget.NetworkMonth:
					repo = this.repoFactory.createFor(NetworkMeasurementMonth);
					idOrError = ok(new NetworkId(dto.id));
					break;
				case AggregationTarget.NodeDay:
					repo = this.repoFactory.createFor(NodeMeasurementDay);
					idOrError = PublicKey.create(dto.id);
					break;
				case AggregationTarget.OrganizationDay:
					repo = this.repoFactory.createFor(OrganizationMeasurementDay);
					idOrError = OrganizationId.create(dto.id, dto.id);
					break;
			}

			if (idOrError.isErr()) {
				return err(idOrError.error);
			}

			return ok(await repo.findBetween(idOrError.value, dto.from, dto.to));
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
