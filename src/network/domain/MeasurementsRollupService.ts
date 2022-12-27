import NetworkUpdate from './NetworkUpdate';

export interface MeasurementsRollupService {
	initializeRollups(): Promise<void>;

	rollupMeasurements(networkUpdate: NetworkUpdate): Promise<void>;

	rollupNodeMeasurements(networkUpdate: NetworkUpdate): Promise<void>;

	rollupOrganizationMeasurements(networkUpdate: NetworkUpdate): Promise<void>;

	rollupNetworkMeasurements(networkUpdate: NetworkUpdate): Promise<void>;

	rollbackNetworkMeasurementRollups(
		networkUpdate: NetworkUpdate
	): Promise<void>;
}
