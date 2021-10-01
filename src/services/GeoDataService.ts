import 'reflect-metadata';
import { Node } from '@stellarbeat/js-stellar-domain';
import axios from 'axios';
import { err, ok, Result } from 'neverthrow';
import { injectable } from 'inversify';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

@injectable()
export class GeoDataService {
	async updateGeoDataForNode(node: Node): Promise<Result<void, Error>> {
		try {
			const accessKey = process.env.IPSTACK_ACCESS_KEY;
			if (!accessKey) {
				return err(new Error('ERROR: ipstack not configured'));
			}

			const url =
				'https://api.ipstack.com/' + node.ip + '?access_key=' + accessKey;
			const source = axios.CancelToken.source();
			setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, 2050);
			const geoDataResponse = await axios.get(url, {
				cancelToken: source.token,
				timeout: 2000,
				headers: { 'User-Agent': 'stellarbeat.io' }
			});
			const geoData = geoDataResponse.data;

			if (geoData.error && geoData.success === false)
				return err(new Error(geoData.error.type));

			if (geoData.longitude === null || geoData.latitude === null)
				return err(new Error('Longitude or latitude has null value'));

			node.geoData.countryCode = geoData.country_code;
			node.geoData.countryName = geoData.country_name;
			node.geoData.regionCode = geoData.region_code;
			node.geoData.regionName = geoData.region_name;
			node.geoData.city = geoData.city;
			node.geoData.zipCode = geoData.zip_code;
			node.geoData.timeZone = geoData.time_zone;
			node.geoData.latitude = geoData.latitude;
			node.geoData.longitude = geoData.longitude;
			node.geoData.metroCode = geoData.metro_code;
			if (geoData.connection) node.isp = geoData.connection.isp;
			return ok(undefined);
		} catch (e) {
			if (e instanceof Error) return err(e);
			const errorMessage = 'Error updating geodata for: ' + node.displayName;

			return err(new Error(errorMessage));
		}
	}

	async updateGeoData(nodes: Node[]): Promise<void> {
		await Promise.all(
			nodes.map(async (node: Node) => {
				const result = await this.updateGeoDataForNode(node);
				if (result.isErr()) console.log(result.error.message);
			})
		);
	}
}
