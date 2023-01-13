import NetworkScan from '../network/scan/NetworkScan';

export interface MeasurementsRollupService {
	initializeRollups(): Promise<void>;

	rollupMeasurements(scan: NetworkScan): Promise<void>;

	rollupNodeMeasurements(scan: NetworkScan): Promise<void>;

	rollupOrganizationMeasurements(scan: NetworkScan): Promise<void>;

	rollupNetworkMeasurements(scan: NetworkScan): Promise<void>;
}
