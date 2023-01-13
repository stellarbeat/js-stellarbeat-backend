import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import { TypeOrmNetworkScanRepository } from '../TypeOrmNetworkScanRepository';
import NetworkScan from '../../../../domain/network/scan/NetworkScan';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NETWORK_TYPES } from '../../../di/di-types';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let networkScanRepository: TypeOrmNetworkScanRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		networkScanRepository = container.get<TypeOrmNetworkScanRepository>(
			NETWORK_TYPES.NetworkScanRepository
		);
	});

	afterEach(async () => {
		await kernel.close();
	});

	it('should store latestLedger correctly', async function () {
		const networkScan = new NetworkScan(new Date(), []);
		networkScan.latestLedger = BigInt(100);

		await networkScanRepository.save(networkScan);

		const fetchedNetworkScan = await networkScanRepository.findOne(1);
		expect(fetchedNetworkScan).toBeDefined();
		if (!fetchedNetworkScan) return;
		expect(fetchedNetworkScan.latestLedger).toEqual(networkScan.latestLedger);
		expect(typeof fetchedNetworkScan.latestLedger).toEqual('bigint');
		expect(fetchedNetworkScan.latestLedgerCloseTime.getTime()).toEqual(
			new Date(0).getTime()
		);
	});
});
