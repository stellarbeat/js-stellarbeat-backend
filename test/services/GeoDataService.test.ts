import { Node } from '@stellarbeat/js-stellar-domain';
import { IpStackGeoDataService } from '../../src/services/IpStackGeoDataService';
import { AxiosHttpService } from '../../src/services/HttpService';
import { ok } from 'neverthrow';

jest.mock('axios');

it('should update geoData', async function () {
	const node = new Node(
		'GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI'
	);

	const axiosHttpService = new AxiosHttpService('test');
	const geoDataService = new IpStackGeoDataService(axiosHttpService, 'key');

	jest.spyOn(axiosHttpService, 'get').mockReturnValue(
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

	await geoDataService.updateGeoData([node]);

	expect(node.geoData.longitude).toEqual(24.934999465942383);
	expect(node.geoData.latitude).toEqual(60.165000915527344);
	expect(node.geoData.countryCode).toEqual('FI');
	expect(node.geoData.countryName).toEqual('Finland');
});
