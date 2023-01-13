import { Repository } from 'typeorm';
import MeasurementRollup from '../database/entities/MeasurementRollup';
import NetworkScan from '../../domain/network/scan/NetworkScan';
import { inject, injectable } from 'inversify';
import { MeasurementsRollupService } from '../../domain/measurement-aggregation/MeasurementsRollupService';
import { NETWORK_TYPES } from '../di/di-types';
import { NodeMeasurementDayRepository } from '../../domain/node/NodeMeasurementDayRepository';
import { MeasurementAggregationRepository } from '../../domain/measurement-aggregation/MeasurementAggregationRepository';
import { OrganizationMeasurementDayRepository } from '../../domain/organization/OrganizationMeasurementDayRepository';
import { NetworkMeasurementDayRepository } from '../../domain/network/NetworkMeasurementDayRepository';
import { NetworkMeasurementMonthRepository } from '../../domain/network/NetworkMeasurementMonthRepository';
import { MeasurementAggregation } from '../../domain/measurement-aggregation/MeasurementAggregation';

@injectable()
export default class DatabaseMeasurementsRollupService
	implements MeasurementsRollupService
{
	constructor(
		@inject('Repository<MeasurementRollup>')
		private measurementRollupRepository: Repository<MeasurementRollup>,
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		private nodeMeasurementDayV2Repository: NodeMeasurementDayRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementDayRepository)
		private organizationMeasurementsDayRepository: OrganizationMeasurementDayRepository,
		@inject(NETWORK_TYPES.NetworkMeasurementDayRepository)
		private networkMeasurementsDayRepository: NetworkMeasurementDayRepository,
		@inject(NETWORK_TYPES.NetworkMeasurementMonthRepository)
		private networkMeasurementMonthRepository: NetworkMeasurementMonthRepository
	) {}

	static readonly NODE_MEASUREMENTS_DAY_ROLLUP = 'node_measurement_day_v2';
	static readonly ORGANIZATION_MEASUREMENTS_DAY_ROLLUP =
		'organization_measurement_day';
	static readonly NETWORK_MEASUREMENTS_DAY_ROLLUP = 'network_measurement_day';
	static readonly NETWORK_MEASUREMENTS_MONTH_ROLLUP =
		'network_measurement_month';

	async initializeRollups() {
		await this.measurementRollupRepository.save([
			new MeasurementRollup(
				DatabaseMeasurementsRollupService.NODE_MEASUREMENTS_DAY_ROLLUP,
				'node_measurement_day_v2'
			),
			new MeasurementRollup(
				DatabaseMeasurementsRollupService.ORGANIZATION_MEASUREMENTS_DAY_ROLLUP,
				'organization_measurement_day'
			),
			new MeasurementRollup(
				DatabaseMeasurementsRollupService.NETWORK_MEASUREMENTS_DAY_ROLLUP,
				'network_measurement_day'
			),
			new MeasurementRollup(
				DatabaseMeasurementsRollupService.NETWORK_MEASUREMENTS_MONTH_ROLLUP,
				'network_measurement_month'
			)
		]);
	}

	async rollupMeasurements(scan: NetworkScan) {
		await this.rollupNodeMeasurements(scan);
		await this.rollupOrganizationMeasurements(scan);
		await this.rollupNetworkMeasurements(scan);
	}

	async rollupNodeMeasurements(scan: NetworkScan) {
		await this.performRollup(
			scan,
			DatabaseMeasurementsRollupService.NODE_MEASUREMENTS_DAY_ROLLUP,
			this.nodeMeasurementDayV2Repository
		);
	}

	async rollupOrganizationMeasurements(scan: NetworkScan) {
		await this.performRollup(
			scan,
			DatabaseMeasurementsRollupService.ORGANIZATION_MEASUREMENTS_DAY_ROLLUP,
			this.organizationMeasurementsDayRepository
		);
	}

	async rollupNetworkMeasurements(scan: NetworkScan) {
		await this.performRollup(
			scan,
			DatabaseMeasurementsRollupService.NETWORK_MEASUREMENTS_DAY_ROLLUP,
			this.networkMeasurementsDayRepository
		);
		await this.performRollup(
			scan,
			DatabaseMeasurementsRollupService.NETWORK_MEASUREMENTS_MONTH_ROLLUP,
			this.networkMeasurementMonthRepository
		);
	}

	protected async performRollup(
		scan: NetworkScan,
		name: string,
		repository: MeasurementAggregationRepository<MeasurementAggregation>
	) {
		const measurementRollup = await this.getMeasurementsRollup(name);
		let aggregateFromCrawlId = measurementRollup.lastAggregatedCrawlId;
		aggregateFromCrawlId++;
		await repository.rollup(aggregateFromCrawlId, scan.id);
		measurementRollup.lastAggregatedCrawlId = scan.id;
		await this.measurementRollupRepository.save(measurementRollup);
	}

	public async getMeasurementsRollup(name: string): Promise<MeasurementRollup> {
		let measurementRollup = await this.measurementRollupRepository.findOne({
			where: {
				name: name
			}
		});
		if (measurementRollup === undefined) {
			await this.initializeRollups();
			measurementRollup = await this.measurementRollupRepository.findOne({
				where: {
					name: name
				}
			});
		}

		return measurementRollup as MeasurementRollup;
	}
}
