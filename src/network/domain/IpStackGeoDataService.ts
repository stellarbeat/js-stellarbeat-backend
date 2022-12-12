import 'reflect-metadata';
import { Node } from '@stellarbeat/js-stellar-domain';
import { err, ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
import { HttpService } from '../../core/services/HttpService';
import { Url } from '../../core/domain/Url';
import {
	isNumber,
	isObject,
	isString
} from '../../core/utilities/TypeGuards';
import { CustomError } from '../../core/errors/CustomError';
import { Logger } from '../../core/services/PinoLogger';

export class GeoDataUpdateError extends CustomError {
	constructor(publicKey: string, cause?: Error) {
		super(
			'Failed updating geoData for ' + publicKey,
			GeoDataUpdateError.name,
			cause
		);
	}
}

export interface GeoDataService {
	updateGeoDataForNode(node: Node): Promise<Result<void, GeoDataUpdateError>>;
	updateGeoData(nodes: Node[]): Promise<void>;
}

@injectable()
export class IpStackGeoDataService implements GeoDataService {
	static IpStackBaseUrl = 'https://api.ipstack.com/';

	constructor(
		@inject('Logger') protected logger: Logger,
		@inject('HttpService') protected httpService: HttpService,
		protected accessKey: string
	) {}

	async updateGeoDataForNode(
		node: Node
	): Promise<Result<void, GeoDataUpdateError>> {
		const urlResult = Url.create(
			IpStackGeoDataService.IpStackBaseUrl +
				node.ip +
				'?access_key=' +
				this.accessKey
		);
		if (urlResult.isErr())
			return err(new GeoDataUpdateError(node.publicKey, urlResult.error));

		const geoDataResponse = await this.httpService.get(urlResult.value);
		if (geoDataResponse.isErr())
			return err(new GeoDataUpdateError(node.publicKey, geoDataResponse.error));

		const geoData = geoDataResponse.value.data;
		if (!isObject(geoData))
			return err(
				new GeoDataUpdateError(
					node.publicKey,
					new Error('No data object present in response')
				)
			);

		if (geoData.success === false) {
			if (isObject(geoData.error) && isString(geoData.error.type))
				return err(
					new GeoDataUpdateError(node.publicKey, new Error(geoData.error.type))
				);
			return err(
				new GeoDataUpdateError(
					node.publicKey,
					new Error('Error contacting IPSTACK')
				)
			);
		}

		if (geoData.longitude === null || geoData.latitude === null)
			return err(
				new GeoDataUpdateError(
					node.publicKey,
					new Error('Longitude or latitude has null value')
				)
			);

		if (isString(geoData.country_code))
			node.geoData.countryCode = geoData.country_code;
		if (isString(geoData.country_name))
			node.geoData.countryName = geoData.country_name;
		if (isNumber(geoData.latitude)) node.geoData.latitude = geoData.latitude;
		if (isNumber(geoData.longitude)) node.geoData.longitude = geoData.longitude;
		if (isObject(geoData.connection) && isString(geoData.connection.isp))
			node.isp = geoData.connection.isp;
		return ok(undefined);
	}

	async updateGeoData(nodes: Node[]): Promise<void> {
		await Promise.all(
			nodes.map(async (node: Node) => {
				const result = await this.updateGeoDataForNode(node);
				if (result.isErr()) this.logger.info(result.error.message);
			})
		);
	}
}
