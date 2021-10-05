import 'reflect-metadata';
import { Node } from '@stellarbeat/js-stellar-domain';
import axios from 'axios';
import { err, ok, Result } from 'neverthrow';
import { injectable } from 'inversify';

export interface GeoDataService {
	updateGeoDataForNode(node: Node): Promise<Result<void, Error>>;
	updateGeoData(nodes: Node[]): Promise<void>;
}

@injectable()
export class IpStackGeoDataService implements GeoDataService {
	protected accessKey: string;

	static IpStackBaseUrl = 'https://api.ipstack.com/';

	constructor(accessKey: string) {
		this.accessKey = accessKey;
	}

	async updateGeoDataForNode(node: Node): Promise<Result<void, Error>> {
		let timeout: NodeJS.Timeout | undefined;
		try {
			const url =
				IpStackGeoDataService.IpStackBaseUrl +
				node.ip +
				'?access_key=' +
				this.accessKey;
			//todo refactor out axios service and encapsulate timeout
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, 2050);
			const geoDataResponse = await axios.get(url, {
				cancelToken: source.token,
				timeout: 2000,
				headers: { 'User-Agent': 'stellarbeat.io' }
			});
			clearTimeout(timeout);
			const geoData = geoDataResponse.data;

			if (geoData.error && geoData.success === false)
				return err(new Error(geoData.error.type));

			if (geoData.longitude === null || geoData.latitude === null)
				return err(new Error('Longitude or latitude has null value'));

			node.geoData.countryCode = geoData.country_code;
			node.geoData.countryName = geoData.country_name;
			node.geoData.latitude = geoData.latitude;
			node.geoData.longitude = geoData.longitude;
			if (geoData.connection) node.isp = geoData.connection.isp;
			return ok(undefined);
		} catch (e) {
			if (timeout) clearTimeout(timeout);
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
