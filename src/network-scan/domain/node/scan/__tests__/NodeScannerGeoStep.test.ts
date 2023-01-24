import { NodeScannerGeoStep } from '../NodeScannerGeoStep';
import { GeoDataService, GeoDataUpdateError } from '../GeoDataService';
import { mock } from 'jest-mock-extended';
import { Logger } from '../../../../../core/services/PinoLogger';
import { NodeScan } from '../NodeScan';
import { err, ok } from 'neverthrow';

describe('NodeScannerGeoStep', () => {
	const geoDataService = mock<GeoDataService>();
	const geoStep = new NodeScannerGeoStep(geoDataService, mock<Logger>());

	beforeEach(() => {
		jest.clearAllMocks();
	});
	it('should not update geo-data when no nodes changed ip', function () {
		const nodeScan = mock<NodeScan>();
		nodeScan.getModifiedIPs.mockReturnValue([]);
		geoStep.execute(nodeScan);
		expect(geoDataService.fetchGeoData).not.toHaveBeenCalled();
	});

	it('should update geo-data when node changed ip', async function () {
		const nodeScan = mock<NodeScan>();
		nodeScan.getModifiedIPs.mockReturnValue(['localhost']);
		geoDataService.fetchGeoData.mockResolvedValue(
			ok({
				latitude: 1,
				longitude: 1,
				countryName: 'country',
				countryCode: 'countryCode',
				isp: 'isp'
			})
		);
		await geoStep.execute(nodeScan);
		expect(nodeScan.updateGeoDataAndISP).toBeCalled();
	});

	it('should not update geo-data when node changed ip but geo-data service failed', async function () {
		const nodeScan = mock<NodeScan>();
		nodeScan.getModifiedIPs.mockReturnValue(['localhost']);
		geoDataService.fetchGeoData.mockResolvedValue(
			err(new GeoDataUpdateError('test'))
		);
		await geoStep.execute(nodeScan);
		expect(nodeScan.updateGeoDataAndISP).not.toBeCalled();
		expect(geoDataService.fetchGeoData).toBeCalled();
	});
});
