import { inject, injectable } from 'inversify';
import { GeoDataService } from './GeoDataService';
import { Logger } from '../../../../core/services/PinoLogger';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import { NodeScan } from './NodeScan';

@injectable()
export class NodeScannerGeoStep {
	constructor(
		@inject('GeoDataService')
		private geoDataService: GeoDataService,
		@inject('Logger')
		private logger: Logger
	) {}

	public async execute(nodeScan: NodeScan): Promise<void> {
		if (nodeScan.getModifiedIPs().length > 0) {
			this.logger.info('Updating geoData info for', {
				nodes: nodeScan.getModifiedIPs()
			});

			const ipMap = new Map<
				string,
				{
					geo: NodeGeoDataLocation;
					isp: string | null;
				}
			>();
			await Promise.all(
				nodeScan.getModifiedIPs().map(async (ip: string) => {
					const result = await this.geoDataService.fetchGeoData(ip);
					if (result.isErr()) this.logger.info(result.error.message);
					else {
						ipMap.set(ip, {
							geo: NodeGeoDataLocation.create({
								latitude: result.value.latitude,
								longitude: result.value.longitude,
								countryName: result.value.countryName,
								countryCode: result.value.countryCode
							}),
							isp: result.value.isp
						});
					}
				})
			);
			if (ipMap.size > 0) nodeScan.updateGeoDataAndISP(ipMap);
		}
	}
}
