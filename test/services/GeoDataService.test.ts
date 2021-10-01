import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

import { Node } from '@stellarbeat/js-stellar-domain';
import { GeoDataService } from '../../src/services/GeoDataService';

jest.mock('axios');

it('should update geoData', async function () {
	const node = new Node(
		'GBHMXTHDK7R2IJFUIDIUWMR7VAKKDSIPC6PT5TDKLACEAU3FBAR2XSUI'
	);

	const geoDataService = new GeoDataService();
	//@ts-ignore
	jest.spyOn(axios.CancelToken, 'source').mockReturnValue({ token: 'token' });
	jest.spyOn(axios, 'get').mockReturnValue({
		//@ts-ignore
		data: {
			country_code: 'FI',
			country_name: 'Finland',
			latitude: 60.165000915527344,
			longitude: 24.934999465942383,
			connection: {
				isp: 'home'
			}
		}
	});

	await geoDataService.updateGeoData([node]);

	expect(node.geoData.longitude).toEqual(24.934999465942383);
	expect(node.geoData.latitude).toEqual(60.165000915527344);
	expect(node.geoData.countryCode).toEqual('FI');
	expect(node.geoData.countryName).toEqual('Finland');
});
