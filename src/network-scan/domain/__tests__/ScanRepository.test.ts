import { ScanRepository } from '../ScanRepository';
import { mock } from 'jest-mock-extended';
import { NodeRepository } from '../node/NodeRepository';
import { OrganizationRepository } from '../organization/OrganizationRepository';
import { NetworkScanRepository } from '../network/scan/NetworkScanRepository';
import { MeasurementsRollupService } from '../measurement-aggregation/MeasurementsRollupService';
import { NodeScan } from '../node/scan/NodeScan';
import { OrganizationScan } from '../organization/scan/OrganizationScan';
import NetworkScan from '../network/scan/NetworkScan';

describe('ScanRepository', () => {
	function setupRepo() {
		const nodeRepository = mock<NodeRepository>();
		const organizationRepository = mock<OrganizationRepository>();
		const networkScanRepository = mock<NetworkScanRepository>();
		const measurementRollupService = mock<MeasurementsRollupService>();

		const scanRepository = new ScanRepository(
			nodeRepository,
			organizationRepository,
			networkScanRepository,
			measurementRollupService
		);

		return {
			nodeRepository,
			organizationRepository,
			networkScanRepository,
			measurementRollupService,
			scanRepository
		};
	}

	it('should save and rollup measurements', async function () {
		const repo = setupRepo();

		const time = new Date();
		const nodeScan = new NodeScan(time, []);
		const organizationScan = new OrganizationScan(time, []);
		const networkScan = new NetworkScan(time);

		const result = await repo.scanRepository.saveAndRollupMeasurements(
			nodeScan,
			organizationScan,
			networkScan
		);

		expect(result.isOk()).toBe(true);
		expect(repo.nodeRepository.save).toBeCalledWith(
			nodeScan.nodes,
			networkScan.time
		);
		expect(repo.organizationRepository.save).toBeCalledWith(
			organizationScan.organizations,
			networkScan.time
		);
		expect(repo.networkScanRepository.saveOne).toBeCalledWith(networkScan);
		expect(repo.measurementRollupService.rollupMeasurements).toBeCalledWith(
			networkScan
		);
	});

	it('should find latest', async function () {
		const latestNetworkScan = new NetworkScan(new Date());
		const repo = setupRepo();
		repo.networkScanRepository.findLatest.mockResolvedValueOnce(
			latestNetworkScan
		);

		const result = await repo.scanRepository.findLatest();
		expect(result.isOk()).toBeTruthy();
		expect(repo.nodeRepository.findActiveAtTimePoint).toBeCalledWith(
			latestNetworkScan.time
		);
		expect(repo.organizationRepository.findActiveAtTimePoint).toBeCalledWith(
			latestNetworkScan.time
		);
	});

	it('should return null if no latest scan', async function () {
		const repo = setupRepo();
		repo.networkScanRepository.findLatest.mockResolvedValueOnce(undefined);

		const result = await repo.scanRepository.findLatest();
		expect(result.isOk()).toBeTruthy();
		if (!result.isOk()) return;
		expect(result.value).toBeNull();
	});

	it('should return error if node repository fails', async function () {
		const latestNetworkScan = new NetworkScan(new Date());
		const repo = setupRepo();
		repo.networkScanRepository.findLatest.mockResolvedValueOnce(
			latestNetworkScan
		);
		repo.nodeRepository.findActiveAtTimePoint.mockRejectedValueOnce(
			new Error('error')
		);

		const result = await repo.scanRepository.findLatest();
		expect(result.isErr()).toBeTruthy();
	});

	it('should return error if organization repository fails', async function () {
		const latestNetworkScan = new NetworkScan(new Date());
		const repo = setupRepo();
		repo.networkScanRepository.findLatest.mockResolvedValueOnce(
			latestNetworkScan
		);
		repo.organizationRepository.findActiveAtTimePoint.mockRejectedValueOnce(
			new Error('error')
		);

		const result = await repo.scanRepository.findLatest();
		expect(result.isErr()).toBeTruthy();
	});

	it('should return error if network scan repository fails', async function () {
		const repo = setupRepo();
		repo.networkScanRepository.findLatest.mockRejectedValueOnce(
			new Error('error')
		);

		const result = await repo.scanRepository.findLatest();
		expect(result.isErr()).toBeTruthy();
	});

	it('should find previous scan', async function () {
		const repo = setupRepo();
		const networkScan = new NetworkScan(new Date());
		repo.networkScanRepository.findPreviousAt.mockResolvedValueOnce(
			networkScan
		);

		const result = await repo.scanRepository.findPrevious(networkScan.time);
		expect(result.isOk()).toBeTruthy();
		expect(repo.nodeRepository.findActiveAtTimePoint).toBeCalledWith(
			networkScan.time
		);
		expect(repo.organizationRepository.findActiveAtTimePoint).toBeCalledWith(
			networkScan.time
		);
	});

	it('should return null if no previous scan', async function () {
		const repo = setupRepo();
		repo.networkScanRepository.findPreviousAt.mockResolvedValueOnce(undefined);

		const result = await repo.scanRepository.findPrevious(new Date());
		expect(result.isOk()).toBeTruthy();
		if (!result.isOk()) return;
		expect(result.value).toBeNull();
	});

	it('should find at time', async function () {
		const repo = setupRepo();
		const networkScan = new NetworkScan(new Date());
		repo.networkScanRepository.findAt.mockResolvedValueOnce(networkScan);

		const result = await repo.scanRepository.findAt(networkScan.time);
		expect(result.isOk()).toBeTruthy();
		expect(repo.nodeRepository.findActiveAtTimePoint).toBeCalledWith(
			networkScan.time
		);
		expect(repo.organizationRepository.findActiveAtTimePoint).toBeCalledWith(
			networkScan.time
		);
	});

	it('should return null if no scan at time', async function () {
		const repo = setupRepo();
		repo.networkScanRepository.findAt.mockResolvedValueOnce(undefined);

		const result = await repo.scanRepository.findAt(new Date());
		expect(result.isOk()).toBeTruthy();
		if (!result.isOk()) return;
		expect(result.value).toBeNull();
	});

	it('should return scan data for update', async function () {
		const latestNetworkScan = new NetworkScan(new Date());
		const repo = setupRepo();
		repo.networkScanRepository.findLatest.mockResolvedValueOnce(
			latestNetworkScan
		);

		const result = await repo.scanRepository.findScanDataForUpdate();
		expect(result.isOk()).toBeTruthy();
		if (!result.isOk()) return;
		expect(repo.nodeRepository.findActive).toBeCalled();
		expect(repo.organizationRepository.findActive).toBeCalled();
	});
});
