import { ScanNetwork } from '../ScanNetwork';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { UpdateNetwork } from '../../update-network/UpdateNetwork';
import { NetworkRepository } from '../../../domain/network/NetworkRepository';
import { NodeMeasurementDayRepository } from '../../../domain/node/NodeMeasurementDayRepository';
import { ScanRepository } from '../../../domain/ScanRepository';
import { Scanner } from '../../../domain/Scanner';
import { Archiver } from '../../../domain/network/scan/archiver/Archiver';
import { HeartBeater } from '../../../../core/services/HeartBeater';
import { Notify } from '../../../../notifications/use-cases/determine-events-and-notify-subscribers/Notify';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { Logger } from '../../../../core/services/PinoLogger';
import { mock } from 'jest-mock-extended';
import { err, ok } from 'neverthrow';
import { Network } from '../../../domain/network/Network';
import { createDummyNetworkProps } from '../../../domain/network/__fixtures__/createDummyNetworkProps';
import { NetworkId } from '../../../domain/network/NetworkId';
import { OrganizationScan } from '../../../domain/organization/scan/OrganizationScan';
import { NodeScan } from '../../../domain/node/scan/NodeScan';
import NetworkScan from '../../../domain/network/scan/NetworkScan';
import { NotifyError } from '../../../../notifications/use-cases/determine-events-and-notify-subscribers/NotifyError';
import { asyncSleep } from '../../../../core/utilities/asyncSleep';
import { JobMonitor } from '../../../../core/services/JobMonitor';

describe('ScanNetwork', () => {
	it('should scan the network', async function () {
		const SUT = setupSUT();
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isOk()).toBe(true);
		if (result.isErr()) fail(result.error);
		expect(SUT.updateNetwork.execute).toHaveBeenCalledTimes(1);
		expect(SUT.networkRepository.findActiveByNetworkId).toHaveBeenCalledTimes(
			1
		);
		expect(
			SUT.nodeMeasurementDayRepository.findXDaysAverageAt
		).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.findScanDataForUpdate).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			1
		);
		expect(SUT.scanner.scan).toHaveBeenCalledTimes(1);
		expect(SUT.archiver.archive).toHaveBeenCalledTimes(1);
		expect(SUT.heartBeater.tick).toHaveBeenCalledTimes(1);
		expect(SUT.notify.execute).toHaveBeenCalledTimes(1);
	});

	it('should return error if network update fails', async function () {
		const SUT = setupSUT();
		SUT.updateNetwork.execute.mockResolvedValue(
			err(new Error('update failed'))
		);
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isErr()).toBe(true);
		if (result.isOk()) fail(result.value);
		expect(SUT.updateNetwork.execute).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			0
		);
	});

	it('should capture error if finding the network fails and abort the scan', async function () {
		const SUT = setupSUT();
		SUT.networkRepository.findActiveByNetworkId.mockImplementation(() => {
			throw new Error('network repository failed');
		});
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isOk()).toBe(true);
		expect(SUT.exceptionLogger.captureException).toHaveBeenCalledTimes(1);
		expect(SUT.updateNetwork.execute).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			0
		);
	});

	it('should capture error if there is no network for the network id and abort the scan', async function () {
		const SUT = setupSUT();
		SUT.networkRepository.findActiveByNetworkId.mockResolvedValue(null);
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isOk()).toBe(true);
		expect(SUT.exceptionLogger.captureException).toHaveBeenCalledTimes(1);
		expect(SUT.updateNetwork.execute).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			0
		);
	});

	it('should capture error if finding the latest scan fails and abort the scan', async function () {
		const SUT = setupSUT();
		SUT.scanRepository.findScanDataForUpdate.mockResolvedValue(
			err(new Error('scan failed'))
		);
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isOk()).toBe(true);
		expect(SUT.exceptionLogger.captureException).toHaveBeenCalledTimes(1);
		expect(SUT.updateNetwork.execute).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			0
		);
	});

	it('should capture error if finding the node measurements fails and abort the scan', async function () {
		const SUT = setupSUT();
		SUT.nodeMeasurementDayRepository.findXDaysAverageAt.mockImplementation(
			() => {
				throw new Error('node measurement repository failed');
			}
		);
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isOk()).toBe(true);
		expect(SUT.exceptionLogger.captureException).toHaveBeenCalledTimes(1);
		expect(SUT.updateNetwork.execute).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			0
		);
	});

	it('should capture error if scanning fails and abort the scan', async function () {
		const SUT = setupSUT();
		SUT.scanner.scan.mockResolvedValue(err(new Error('scan failed')));
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isOk()).toBe(true);
		expect(SUT.exceptionLogger.captureException).toHaveBeenCalledTimes(1);
		expect(SUT.updateNetwork.execute).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			0
		);
	});

	it('should capture error if saving the scan fails', async function () {
		const SUT = setupSUT();
		SUT.scanRepository.saveAndRollupMeasurements.mockResolvedValue(
			err(new Error('save failed'))
		);
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isOk()).toBe(true);
		expect(SUT.exceptionLogger.captureException).toHaveBeenCalledTimes(1);
		expect(SUT.updateNetwork.execute).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			1
		);
	});

	it('should capture error if notify fails', async function () {
		const SUT = setupSUT();
		SUT.notify.execute.mockResolvedValue(err(mock<NotifyError>()));
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isOk()).toBe(true);
		expect(SUT.exceptionLogger.captureException).toHaveBeenCalledTimes(1);
		expect(SUT.updateNetwork.execute).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			1
		);
	});

	it('should capture error if archiving fails', async function () {
		const SUT = setupSUT();
		SUT.archiver.archive.mockResolvedValue(err(new Error('archive failed')));
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isOk()).toBe(true);
		expect(SUT.exceptionLogger.captureException).toHaveBeenCalledTimes(1);
		expect(SUT.updateNetwork.execute).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			1
		);
	});

	it('should capture error if heartbeat fails', async function () {
		const SUT = setupSUT();
		SUT.heartBeater.tick.mockResolvedValue(err(new Error('heartbeat failed')));
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isOk()).toBe(true);
		expect(SUT.exceptionLogger.captureException).toHaveBeenCalledTimes(1);
		expect(SUT.updateNetwork.execute).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			1
		);
	});

	it('should capture error if known-peers are invalid and abort scan', async function () {
		const SUT = setupSUT();
		SUT.networkConfig.knownPeers = [['invalid', -1]];
		const result = await SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		expect(result.isOk()).toBe(true);
		expect(SUT.exceptionLogger.captureException).toHaveBeenCalledTimes(1);
		expect(SUT.scanRepository.saveAndRollupMeasurements).toHaveBeenCalledTimes(
			0
		);
	});

	it('should shutdown', function (done) {
		const SUT = setupSUT();
		SUT.scanNetwork.shutDown(() => {
			done();
		});
	});

	it('should not shutdown immediately if persisting', function (done) {
		const SUT = setupSUT();
		SUT.scanRepository.saveAndRollupMeasurements.mockImplementation(
			async () => {
				await asyncSleep(200);
				return ok(undefined);
			}
		);
		SUT.scanNetwork.execute({
			updateNetwork: true,
			dryRun: false
		});
		asyncSleep(100).then(() => {
			SUT.scanNetwork.shutDown(() => {
				expect(SUT.logger.info).toHaveBeenCalledWith(
					'Persisting update, will shutdown when ready' //todo: brittle test
				);
				done();
			});
		});
	});

	function getScanResult() {
		return {
			organizationScan: new OrganizationScan(new Date(), []),
			nodeScan: new NodeScan(new Date(), []),
			networkScan: new NetworkScan(new Date())
		};
	}

	function setupSUT() {
		//setup ScanNetwork with mock dependencies
		const networkConfig = new ConfigMock().networkConfig;
		const updateNetwork = mock<UpdateNetwork>();
		updateNetwork.execute.mockResolvedValue(ok(undefined));
		const networkRepository = mock<NetworkRepository>();
		networkRepository.findActiveByNetworkId.mockResolvedValue(createNetwork());
		const nodeMeasurementDayRepository = mock<NodeMeasurementDayRepository>();
		nodeMeasurementDayRepository.findXDaysAverageAt.mockResolvedValue([]);
		const scanRepository = mock<ScanRepository>();
		scanRepository.findScanDataForUpdate.mockResolvedValue(ok(getScanResult()));
		scanRepository.saveAndRollupMeasurements.mockResolvedValue(ok(undefined));
		const scanner = mock<Scanner>();
		scanner.scan.mockResolvedValue(ok(getScanResult()));
		const archiver = mock<Archiver>();
		archiver.archive.mockResolvedValue(ok(undefined));
		const heartBeater = mock<HeartBeater>();
		heartBeater.tick.mockResolvedValue(ok(undefined));
		const notify = mock<Notify>();
		notify.execute.mockResolvedValue(ok(undefined));
		const exceptionLogger = mock<ExceptionLogger>();
		const logger = mock<Logger>();
		const jobMonitor = mock<JobMonitor>();
		jobMonitor.checkIn.mockResolvedValue(ok(undefined));

		const scanNetwork = new ScanNetwork(
			networkConfig,
			updateNetwork,
			networkRepository,
			nodeMeasurementDayRepository,
			scanRepository,
			scanner,
			archiver,
			heartBeater,
			notify,
			exceptionLogger,
			logger,
			jobMonitor
		);

		return {
			scanNetwork,
			networkConfig,
			updateNetwork,
			networkRepository,
			nodeMeasurementDayRepository,
			scanRepository,
			scanner,
			archiver,
			heartBeater,
			notify,
			exceptionLogger,
			logger
		};
	}
	function createNetwork(): Network {
		return Network.create(
			new Date(),
			new NetworkId('test'),
			'test',
			createDummyNetworkProps()
		);
	}
});
