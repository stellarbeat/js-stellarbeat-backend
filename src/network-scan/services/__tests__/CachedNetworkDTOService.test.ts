import { mock } from 'jest-mock-extended';
import { NetworkDTOService } from '../NetworkDTOService';
import { CachedNetworkDTOService } from '../CachedNetworkDTOService';
import { ok } from 'neverthrow';
import { createDummyNetworkV1 } from '../__fixtures__/createDummyNetworkV1';
import { NetworkScanRepository } from '../../domain/network/scan/NetworkScanRepository';

describe('CachedNetworkDTOService', () => {
	it('should return cached network dto', async () => {
		const networkDTOService = mock<NetworkDTOService>();
		const networkScanRepository = mock<NetworkScanRepository>();

		const cachedNetworkDTOService = new CachedNetworkDTOService(
			networkDTOService,
			networkScanRepository
		);

		const networkDTO = createDummyNetworkV1();
		networkDTOService.getLatestNetworkDTO.mockResolvedValueOnce(ok(networkDTO));

		const scanTime = new Date();
		networkScanRepository.findLatestSuccessfulScanTime.mockResolvedValue(
			scanTime
		);

		const result = await cachedNetworkDTOService.getLatestNetworkDTO();
		expect(result.isOk()).toBeTruthy();
		if (!result.isOk()) return;
		expect(result.value).toEqual(networkDTO);

		const result2 = await cachedNetworkDTOService.getLatestNetworkDTO();
		expect(result2.isOk()).toBeTruthy();
		if (!result2.isOk()) return;
		expect(result2.value).toEqual(networkDTO);

		expect(networkDTOService.getLatestNetworkDTO).toHaveBeenCalledTimes(1);
	});

	it('should return null if no network scan found', async () => {
		const networkDTOService = mock<NetworkDTOService>();
		const networkScanRepository = mock<NetworkScanRepository>();

		const cachedNetworkDTOService = new CachedNetworkDTOService(
			networkDTOService,
			networkScanRepository
		);

		networkScanRepository.findLatestSuccessfulScanTime.mockResolvedValue(
			undefined
		);

		const result = await cachedNetworkDTOService.getLatestNetworkDTO();
		expect(result.isOk()).toBeTruthy();
		if (!result.isOk()) return;
		expect(result.value).toBeNull();
	});

	it('should return error if fetching scan fails', async () => {
		const networkDTOService = mock<NetworkDTOService>();
		const networkScanRepository = mock<NetworkScanRepository>();

		const cachedNetworkDTOService = new CachedNetworkDTOService(
			networkDTOService,
			networkScanRepository
		);

		const error = new Error('test');
		networkScanRepository.findLatestSuccessfulScanTime.mockRejectedValue(error);

		const result = await cachedNetworkDTOService.getLatestNetworkDTO();
		expect(result.isErr()).toBeTruthy();
	});

	it('should return error if fetching network dto fails', async () => {
		const networkDTOService = mock<NetworkDTOService>();
		const networkScanRepository = mock<NetworkScanRepository>();

		const cachedNetworkDTOService = new CachedNetworkDTOService(
			networkDTOService,
			networkScanRepository
		);

		const scanTime = new Date();
		networkScanRepository.findLatestSuccessfulScanTime.mockResolvedValue(
			scanTime
		);

		const error = new Error('test');
		networkDTOService.getLatestNetworkDTO.mockRejectedValue(error);

		const result = await cachedNetworkDTOService.getLatestNetworkDTO();
		expect(result.isErr()).toBeTruthy();
	});
});
