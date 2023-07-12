import { NetworkDTOService } from '../NetworkDTOService';
import { mock } from 'jest-mock-extended';
import { ScanRepository } from '../../domain/ScanRepository';
import { NodeDTOService } from '../NodeDTOService';
import { OrganizationDTOService } from '../OrganizationDTOService';
import { err, ok } from 'neverthrow';
import NetworkScan from '../../domain/network/scan/NetworkScan';
import NetworkMeasurement from '../../domain/network/NetworkMeasurement';
import { ScanResult } from '../../domain/Scanner';
import { NodeScan } from '../../domain/node/scan/NodeScan';
import { OrganizationScan } from '../../domain/organization/scan/OrganizationScan';
import { NetworkRepository } from '../../domain/network/NetworkRepository';
import { Network } from '../../domain/network/Network';
import { NetworkId } from '../../domain/network/NetworkId';
import { createDummyNetworkProps } from '../../domain/network/__fixtures__/createDummyNetworkProps';

describe('NetworkDTOService', () => {
	it('should get NetworkDTO at', async function () {
		const scanResult = createScanResult();
		const service = setupService();
		service.scanRepository.findAt.mockResolvedValue(ok(scanResult));
		service.networkRepository.findAtDateByNetworkId.mockResolvedValue(
			Network.create(
				new Date(),
				new NetworkId(service.networkId),
				'passphrase',
				createDummyNetworkProps()
			)
		);
		const result = await service.networkDTOService.getNetworkDTOAt(new Date());
		expect(result.isOk()).toBeTruthy();
		if (result.isErr()) throw new Error('Should not be an error');
		expect(result.value?.id).toBe('id');
		expect(result.value?.name).toBe('name');
	});

	it('should return null if no NetworkDTO at time', async function () {
		const service = setupService();
		service.scanRepository.findAt.mockResolvedValue(ok(null));

		const result = await service.networkDTOService.getNetworkDTOAt(new Date());
		expect(result.isOk()).toBeTruthy();
		if (result.isErr()) throw new Error('Should not be an error');
		expect(result.value).toBeNull();
	});

	it('should return error if nodeDTOService fails', async function () {
		const scanResult = createScanResult();
		const service = setupService();
		service.scanRepository.findAt.mockResolvedValue(ok(scanResult));
		service.nodeDTOService.getNodeDTOs.mockImplementation(async () => {
			return err(new Error('error'));
		});

		const result = await service.networkDTOService.getNetworkDTOAt(new Date());
		expect(result.isErr()).toBeTruthy();
	});

	it('should return error if organizationDTOService fails', async function () {
		const scanResult = createScanResult();
		const service = setupService();
		service.scanRepository.findAt.mockResolvedValue(ok(scanResult));
		service.organizationDTOService.getOrganizationDTOs.mockImplementation(
			async () => {
				return err(new Error('error'));
			}
		);

		const result = await service.networkDTOService.getNetworkDTOAt(new Date());
		expect(result.isErr()).toBeTruthy();
	});

	it('should get latest NetworkDTO', async function () {
		const scanResult = createScanResult();
		const service = setupService();
		service.scanRepository.findLatest.mockResolvedValue(ok(scanResult));
		service.networkRepository.findAtDateByNetworkId.mockResolvedValue(
			Network.create(
				new Date(),
				new NetworkId(service.networkId),
				'passphrase',
				createDummyNetworkProps()
			)
		);

		const result = await service.networkDTOService.getLatestNetworkDTO();
		expect(result.isOk()).toBeTruthy();
		if (result.isErr()) throw new Error('Should not be an error');
		expect(result.value?.id).toBe('id');
		expect(result.value?.name).toBe('name');
	});

	it('should return null if no latest NetworkDTO', async function () {
		const service = setupService();
		service.scanRepository.findLatest.mockResolvedValue(ok(null));

		const result = await service.networkDTOService.getLatestNetworkDTO();
		expect(result.isOk()).toBeTruthy();
		if (result.isErr()) throw new Error('Should not be an error');
		expect(result.value).toBeNull();
	});

	it('should get previous NetworkDTO', async function () {
		const scanResult = createScanResult();
		const service = setupService();
		service.scanRepository.findPrevious.mockResolvedValue(ok(scanResult));
		service.networkRepository.findAtDateByNetworkId.mockResolvedValue(
			Network.create(
				new Date(),
				new NetworkId(service.networkId),
				'passphrase',
				createDummyNetworkProps()
			)
		);

		const result = await service.networkDTOService.getPreviousNetworkDTO(
			new Date()
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isErr()) throw new Error('Should not be an error');
		expect(result.value?.id).toBe('id');
		expect(result.value?.name).toBe('name');
	});

	it('should return null if no previous NetworkDTO', async function () {
		const service = setupService();
		service.scanRepository.findPrevious.mockResolvedValue(ok(null));

		const result = await service.networkDTOService.getPreviousNetworkDTO(
			new Date()
		);
		expect(result.isOk()).toBeTruthy();
		if (result.isErr()) throw new Error('Should not be an error');
		expect(result.value).toBeNull();
	});

	it('should return error if no network is found', async function () {
		const scanResult = createScanResult();
		const service = setupService();
		service.scanRepository.findLatest.mockResolvedValue(ok(scanResult));
		service.networkRepository.findAtDateByNetworkId.mockResolvedValue(null);

		const result = await service.networkDTOService.getLatestNetworkDTO();
		expect(result.isErr()).toBeTruthy();
	});

	it('should return network passphrase if a network is found that does not have any snapshots', async function () {
		const scanResult = createScanResult();
		const service = setupService();
		service.scanRepository.findLatest.mockResolvedValue(ok(scanResult));
		service.networkRepository.findAtDateByNetworkId.mockResolvedValue(null);
		service.networkRepository.findPassphraseByNetworkId.mockResolvedValue(
			'passphrase'
		);

		const result = await service.networkDTOService.getLatestNetworkDTO();
		expect(result.isOk()).toBeTruthy();
		if (result.isErr()) throw new Error('Should not be an error');
		expect(result.value?.passPhrase).toBe('passphrase');
	});

	function setupService() {
		const scanRepository = mock<ScanRepository>();
		const nodeDTOService = mock<NodeDTOService>();
		nodeDTOService.getNodeDTOs.mockResolvedValue(ok([]));
		const organizationDTOService = mock<OrganizationDTOService>();
		organizationDTOService.getOrganizationDTOs.mockResolvedValue(ok([]));
		const networkRepository = mock<NetworkRepository>();
		const networkId = 'id';

		const networkDTOService = new NetworkDTOService(
			scanRepository,
			nodeDTOService,
			organizationDTOService,
			networkRepository,
			networkId,
			'name'
		);

		return {
			scanRepository,
			nodeDTOService,
			organizationDTOService,
			networkDTOService,
			networkRepository,
			networkId
		};
	}

	function createScanResult() {
		const time = new Date();
		const networkScan = new NetworkScan(time);
		networkScan.measurement = new NetworkMeasurement(time);
		const scanResult: ScanResult = {
			nodeScan: new NodeScan(time, []),
			organizationScan: new OrganizationScan(time, []),
			networkScan: networkScan
		};
		return scanResult;
	}
});
