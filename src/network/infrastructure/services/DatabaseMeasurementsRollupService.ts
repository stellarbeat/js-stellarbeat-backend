import { Repository } from 'typeorm';
import MeasurementRollup from '../database/entities/MeasurementRollup';
import NetworkUpdate from '../../domain/NetworkUpdate';
import { NetworkMeasurementDayRepository } from '../database/repositories/NetworkMeasurementDayRepository';
import { inject, injectable } from 'inversify';
import { NetworkMeasurementMonthRepository } from '../database/repositories/NetworkMeasurementMonthRepository';
import { MeasurementsRollupService } from '../../domain/measurement/MeasurementsRollupService';
import { NETWORK_TYPES } from '../di/di-types';
import { NodeMeasurementDayRepository } from '../../domain/measurement/NodeMeasurementDayRepository';
import { MeasurementRollupRepository } from '../../domain/measurement/MeasurementRollupRepository';
import { OrganizationMeasurementDayRepository } from '../../domain/measurement/OrganizationMeasurementDayRepository';

@injectable()
export default class DatabaseMeasurementsRollupService
	implements MeasurementsRollupService
{
	protected measurementRollupRepository: Repository<MeasurementRollup>;
	protected nodeMeasurementDayV2Repository: NodeMeasurementDayRepository;
	protected organizationMeasurementsDayRepository: OrganizationMeasurementDayRepository;
	protected networkMeasurementsDayRepository: NetworkMeasurementDayRepository;
	protected networkMeasurementsMonthRepository: NetworkMeasurementMonthRepository;

	constructor(
		@inject('Repository<MeasurementRollup>')
		measurementRollupRepository: Repository<MeasurementRollup>,
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		nodeMeasurementDayV2Repository: NodeMeasurementDayRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementDayRepository)
		organizationMeasurementsDayRepository: OrganizationMeasurementDayRepository,
		networkMeasurementsDayRepository: NetworkMeasurementDayRepository,
		networkMeasurementMonthRepository: NetworkMeasurementMonthRepository
	) {
		this.measurementRollupRepository = measurementRollupRepository;
		this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
		this.organizationMeasurementsDayRepository =
			organizationMeasurementsDayRepository;
		this.networkMeasurementsDayRepository = networkMeasurementsDayRepository;
		this.networkMeasurementsMonthRepository = networkMeasurementMonthRepository;
	}

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

	async rollupMeasurements(networkUpdate: NetworkUpdate) {
		await this.rollupNodeMeasurements(networkUpdate);
		await this.rollupOrganizationMeasurements(networkUpdate);
		await this.rollupNetworkMeasurements(networkUpdate);
	}

	async rollupNodeMeasurements(networkUpdate: NetworkUpdate) {
		await this.performRollup(
			networkUpdate,
			DatabaseMeasurementsRollupService.NODE_MEASUREMENTS_DAY_ROLLUP,
			this.nodeMeasurementDayV2Repository
		);
	}

	async rollupOrganizationMeasurements(networkUpdate: NetworkUpdate) {
		await this.performRollup(
			networkUpdate,
			DatabaseMeasurementsRollupService.ORGANIZATION_MEASUREMENTS_DAY_ROLLUP,
			this.organizationMeasurementsDayRepository
		);
	}

	async rollupNetworkMeasurements(networkUpdate: NetworkUpdate) {
		await this.performRollup(
			networkUpdate,
			DatabaseMeasurementsRollupService.NETWORK_MEASUREMENTS_DAY_ROLLUP,
			this.networkMeasurementsDayRepository
		);
		await this.performRollup(
			networkUpdate,
			DatabaseMeasurementsRollupService.NETWORK_MEASUREMENTS_MONTH_ROLLUP,
			this.networkMeasurementsMonthRepository
		);
	}

	protected async performRollup(
		networkUpdate: NetworkUpdate,
		name: string,
		repository: MeasurementRollupRepository
	) {
		const measurementRollup = await this.getMeasurementsRollup(name);
		let aggregateFromCrawlId = measurementRollup.lastAggregatedCrawlId;
		aggregateFromCrawlId++;
		await repository.rollup(aggregateFromCrawlId, networkUpdate.id);
		measurementRollup.lastAggregatedCrawlId = networkUpdate.id;
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
