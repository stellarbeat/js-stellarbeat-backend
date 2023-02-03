import { Scanner } from '../Scanner';
import { NodeScanner } from '../node/scan/NodeScanner';
import { mock } from 'jest-mock-extended';
import { OrganizationScanner } from '../organization/scan/OrganizationScanner';
import { NetworkScanner } from '../network/scan/NetworkScanner';
import { Logger } from '../../../core/services/PinoLogger';
import { Network } from '../network/Network';
import { createDummyNetworkProps } from '../network/__fixtures__/createDummyNetworkProps';
import { NetworkId } from '../network/NetworkId';
import { err, ok } from 'neverthrow';
import { NodeScan } from '../node/scan/NodeScan';
import { OrganizationScan } from '../organization/scan/OrganizationScan';
import NetworkScan from '../network/scan/NetworkScan';
import { OrganizationScanError } from '../organization/scan/errors/OrganizationScanError';
import { createDummyNodeAddress } from '../node/__fixtures__/createDummyNodeAddress';

describe('Scanner', function () {
	it('should scan', async function () {
		const nodeScanner = mock<NodeScanner>();
		nodeScanner.execute.mockResolvedValue(ok(mock<NodeScan>()));
		const organizationScanner = mock<OrganizationScanner>();
		organizationScanner.execute.mockResolvedValue(ok(mock<OrganizationScan>()));
		const networkScanner = mock<NetworkScanner>();
		networkScanner.execute.mockResolvedValue(ok(mock<NetworkScan>()));

		const scanner = new Scanner(
			nodeScanner,
			organizationScanner,
			networkScanner,
			mock<Logger>()
		);

		const time = new Date();
		const network = createNetwork(time);

		const scanOrError = await scanner.scan(
			new Date(),
			network,
			null,
			[],
			[createDummyNodeAddress()]
		);
		expect(scanOrError.isOk()).toBe(true);
		expect(nodeScanner.execute).toBeCalledTimes(1);
		expect(organizationScanner.execute).toBeCalledTimes(1);
		expect(networkScanner.execute).toBeCalledTimes(1);
	});

	it('should return error if no previous scan and no known node addresses', async function () {
		const nodeScanner = mock<NodeScanner>();
		nodeScanner.execute.mockResolvedValue(ok(mock<NodeScan>()));
		const organizationScanner = mock<OrganizationScanner>();
		organizationScanner.execute.mockResolvedValue(ok(mock<OrganizationScan>()));
		const networkScanner = mock<NetworkScanner>();
		networkScanner.execute.mockResolvedValue(ok(mock<NetworkScan>()));

		const scanner = new Scanner(
			nodeScanner,
			organizationScanner,
			networkScanner,
			mock<Logger>()
		);

		const time = new Date();
		const network = createNetwork(time);

		const scanOrError = await scanner.scan(new Date(), network, null, [], []);
		expect(scanOrError.isOk()).toBe(false);
		expect(nodeScanner.execute).toBeCalledTimes(0);
		expect(organizationScanner.execute).toBeCalledTimes(0);
		expect(networkScanner.execute).toBeCalledTimes(0);
	});

	it('should return error if node-scan fails', async function () {
		const nodeScanner = mock<NodeScanner>();
		nodeScanner.execute.mockResolvedValue(err(new Error('test')));
		const organizationScanner = mock<OrganizationScanner>();
		const networkScanner = mock<NetworkScanner>();

		const scanner = new Scanner(
			nodeScanner,
			organizationScanner,
			networkScanner,
			mock<Logger>()
		);

		const time = new Date();
		const network = createNetwork(time);

		const scanOrError = await scanner.scan(
			new Date(),
			network,
			null,
			[],
			[createDummyNodeAddress()]
		);
		expect(scanOrError.isOk()).toBe(false);
	});

	it('should return error if organization-scan fails', async function () {
		const nodeScanner = mock<NodeScanner>();
		nodeScanner.execute.mockResolvedValue(ok(mock<NodeScan>()));
		const organizationScanner = mock<OrganizationScanner>();
		organizationScanner.execute.mockResolvedValue(
			err(mock<OrganizationScanError>())
		);
		const networkScanner = mock<NetworkScanner>();

		const scanner = new Scanner(
			nodeScanner,
			organizationScanner,
			networkScanner,
			mock<Logger>()
		);

		const time = new Date();
		const network = createNetwork(time);

		const scanOrError = await scanner.scan(
			new Date(),
			network,
			null,
			[],
			[createDummyNodeAddress()]
		);
		expect(scanOrError.isOk()).toBeFalsy();
	});

	it('should return error if network-scan fails', async function () {
		const nodeScanner = mock<NodeScanner>();
		nodeScanner.execute.mockResolvedValue(ok(mock<NodeScan>()));
		const organizationScanner = mock<OrganizationScanner>();
		organizationScanner.execute.mockResolvedValue(ok(mock<OrganizationScan>()));
		const networkScanner = mock<NetworkScanner>();
		networkScanner.execute.mockResolvedValue(err(new Error('test')));

		const scanner = new Scanner(
			nodeScanner,
			organizationScanner,
			networkScanner,
			mock<Logger>()
		);

		const time = new Date();
		const network = createNetwork(time);

		const scanOrError = await scanner.scan(
			new Date(),
			network,
			null,
			[],
			[createDummyNodeAddress()]
		);
		expect(scanOrError.isOk()).toBeFalsy();
	});

	function createNetwork(time: Date) {
		return Network.create(
			time,
			new NetworkId('test'),
			'passphrase',
			createDummyNetworkProps()
		);
	}
});
