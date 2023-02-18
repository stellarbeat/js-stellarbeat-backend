import { ok } from 'neverthrow';
import { LoggerMock } from '../../../../core/services/__mocks__/LoggerMock';
import { mock } from 'jest-mock-extended';
import { HttpService } from '../../../../core/services/HttpService';
import { IpStackGeoDataService } from '../IpStackGeoDataService';

const httpService = mock<HttpService>();

it('should update geoData', async function () {
	const geoDataService = new IpStackGeoDataService(
		new LoggerMock(),
		httpService,
		'key'
	);

	httpService.get.mockReturnValue(
		new Promise((resolve) =>
			resolve(
				ok({
					data: {
						country_code: 'FI',
						country_name: 'Finland',
						latitude: 60.165000915527344,
						longitude: 24.934999465942383,
						connection: {
							isp: 'home'
						}
					},
					status: 200,
					statusText: 'ok',
					headers: {}
				})
			)
		)
	);

	const geoDataOrError = await geoDataService.fetchGeoData('localhost');
	expect(geoDataOrError.isOk()).toBeTruthy();
	if (geoDataOrError.isErr()) return;
	const geoData = geoDataOrError.value;

	expect(geoData.longitude).toEqual(24.934999465942383);
	expect(geoData.latitude).toEqual(60.165000915527344);
	expect(geoData.countryCode).toEqual('FI');
	expect(geoData.countryName).toEqual('Finland');
	expect(geoData.isp).toEqual('home');
});
