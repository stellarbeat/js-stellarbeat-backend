import { inject, injectable } from 'inversify';
import { Logger } from '../../../core/services/PinoLogger';
import { HttpService } from '../../../core/services/HttpService';
import { err, ok, Result } from 'neverthrow';
import { Url } from '../../../core/domain/Url';
import {
	isNumber,
	isObject,
	isString
} from '../../../core/utilities/TypeGuards';
import {
	GeoData,
	GeoDataService,
	GeoDataUpdateError
} from '../../domain/node/scan/GeoDataService';

@injectable()
export class IpStackGeoDataService implements GeoDataService {
	static IpStackBaseUrl = 'https://api.ipstack.com/';

	constructor(
		@inject('Logger') protected logger: Logger,
		@inject('HttpService') protected httpService: HttpService,
		protected accessKey: string
	) {}

	async fetchGeoData(ip: string): Promise<Result<GeoData, GeoDataUpdateError>> {
		const urlResult = Url.create(
			IpStackGeoDataService.IpStackBaseUrl +
				ip +
				'?access_key=' +
				this.accessKey
		);
		if (urlResult.isErr())
			return err(new GeoDataUpdateError(ip, urlResult.error));

		const geoDataResponse = await this.httpService.get(urlResult.value);
		if (geoDataResponse.isErr())
			return err(new GeoDataUpdateError(ip, geoDataResponse.error));

		const geoData = geoDataResponse.value.data;
		if (!isObject(geoData))
			return err(
				new GeoDataUpdateError(
					ip,
					new Error('No data object present in response')
				)
			);

		if (geoData.success === false) {
			if (isObject(geoData.error) && isString(geoData.error.type))
				return err(new GeoDataUpdateError(ip, new Error(geoData.error.type)));
			return err(
				new GeoDataUpdateError(ip, new Error('Error contacting IPSTACK'))
			);
		}

		if (geoData.longitude === null || geoData.latitude === null)
			return err(
				new GeoDataUpdateError(
					ip,
					new Error('Longitude or latitude has null value')
				)
			);

		const geoDataResult: GeoData = {
			longitude: isNumber(geoData.longitude) ? geoData.longitude : null,
			latitude: isNumber(geoData.latitude) ? geoData.latitude : null,
			countryName: isString(geoData.country_name) ? geoData.country_name : null,
			countryCode: isString(geoData.country_code) ? geoData.country_code : null,
			isp:
				isObject(geoData.connection) && isString(geoData.connection.isp)
					? geoData.connection.isp
					: null
		};

		return ok(geoDataResult);
	}
}
