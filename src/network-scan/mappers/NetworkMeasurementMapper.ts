import NetworkMeasurement from '../domain/network/NetworkMeasurement';
import NetworkStatistics from '@stellarbeat/js-stellarbeat-shared/lib/network-statistics';

export class NetworkMeasurementMapper {
	static mapToNetworkStatistics(measurement: NetworkMeasurement) {
		const networkStatistics = new NetworkStatistics();

		for (const key of Object.keys(measurement)) {
			//Object.keys only returns properties that have a value in typescript
			if (key === 'time') continue;
			// @ts-ignore
			networkStatistics[key] = measurement[key];
		} //todo: needs better mapper

		return networkStatistics;
	}
}
