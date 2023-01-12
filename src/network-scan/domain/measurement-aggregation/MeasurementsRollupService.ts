import NetworkUpdate from '../network/scan/NetworkUpdate';

export interface MeasurementsRollupService {
	initializeRollups(): Promise<void>;

	rollupMeasurements(networkUpdate: NetworkUpdate): Promise<void>;

	rollupNodeMeasurements(networkUpdate: NetworkUpdate): Promise<void>;

	rollupOrganizationMeasurements(networkUpdate: NetworkUpdate): Promise<void>;

	rollupNetworkMeasurements(networkUpdate: NetworkUpdate): Promise<void>;
}
