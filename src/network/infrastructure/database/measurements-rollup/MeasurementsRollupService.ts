import { Repository } from 'typeorm';
import MeasurementRollup from '../entities/MeasurementRollup';
import NetworkUpdate from '../../../../network-update/domain/NetworkUpdate';
import {
	IMeasurementRollupRepository,
	NodeMeasurementDayV2Repository
} from '../repositories/NodeMeasurementDayV2Repository';
import { OrganizationMeasurementDayRepository } from '../repositories/OrganizationMeasurementDayRepository';
import { NetworkMeasurementDayRepository } from '../repositories/NetworkMeasurementDayRepository';
import { inject, injectable } from 'inversify';
import { NetworkMeasurementMonthRepository } from '../repositories/NetworkMeasurementMonthRepository';

@injectable()
export default class MeasurementsRollupService {
	protected measurementRollupRepository: Repository<MeasurementRollup>;
	protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
	protected organizationMeasurementsDayRepository: OrganizationMeasurementDayRepository;
	protected networkMeasurementsDayRepository: NetworkMeasurementDayRepository;
	protected networkMeasurementsMonthRepository: NetworkMeasurementMonthRepository;

	constructor(
		@inject('Repository<MeasurementRollup>')
		measurementRollupRepository: Repository<MeasurementRollup>,
		nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository,
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
				MeasurementsRollupService.NODE_MEASUREMENTS_DAY_ROLLUP,
				'node_measurement_day_v2'
			),
			new MeasurementRollup(
				MeasurementsRollupService.ORGANIZATION_MEASUREMENTS_DAY_ROLLUP,
				'organization_measurement_day'
			),
			new MeasurementRollup(
				MeasurementsRollupService.NETWORK_MEASUREMENTS_DAY_ROLLUP,
				'network_measurement_day'
			),
			new MeasurementRollup(
				MeasurementsRollupService.NETWORK_MEASUREMENTS_MONTH_ROLLUP,
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
			MeasurementsRollupService.NODE_MEASUREMENTS_DAY_ROLLUP,
			this.nodeMeasurementDayV2Repository
		);
	}

	async rollupOrganizationMeasurements(networkUpdate: NetworkUpdate) {
		await this.performRollup(
			networkUpdate,
			MeasurementsRollupService.ORGANIZATION_MEASUREMENTS_DAY_ROLLUP,
			this.organizationMeasurementsDayRepository
		);
	}

	async rollupNetworkMeasurements(networkUpdate: NetworkUpdate) {
		await this.performRollup(
			networkUpdate,
			MeasurementsRollupService.NETWORK_MEASUREMENTS_DAY_ROLLUP,
			this.networkMeasurementsDayRepository
		);
		await this.performRollup(
			networkUpdate,
			MeasurementsRollupService.NETWORK_MEASUREMENTS_MONTH_ROLLUP,
			this.networkMeasurementsMonthRepository
		);
	}

	async rollbackNetworkMeasurementRollups(networkUpdate: NetworkUpdate) {
		await this.networkMeasurementsDayRepository.deleteFrom(networkUpdate.time);
		await this.networkMeasurementsMonthRepository.deleteFrom(
			networkUpdate.time
		);
		const dayRollup = await this.getMeasurementsRollup(
			MeasurementsRollupService.NETWORK_MEASUREMENTS_DAY_ROLLUP
		);
		dayRollup.lastAggregatedCrawlId = networkUpdate.id--;
		await this.measurementRollupRepository.save(dayRollup);
		const monthRollup = await this.getMeasurementsRollup(
			MeasurementsRollupService.NETWORK_MEASUREMENTS_DAY_ROLLUP
		);
		monthRollup.lastAggregatedCrawlId = networkUpdate.id--;
		await this.measurementRollupRepository.save(monthRollup);
	}

	protected async performRollup(
		networkUpdate: NetworkUpdate,
		name: string,
		repository: IMeasurementRollupRepository
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

		return measurementRollup!;
	}
}
