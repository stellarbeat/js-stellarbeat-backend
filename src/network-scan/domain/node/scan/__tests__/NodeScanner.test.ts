import { mock } from 'jest-mock-extended';
import { Logger } from '../../../../../core/services/PinoLogger';
import { createDummyPublicKey } from '../../__fixtures__/createDummyPublicKey';
import { NodeScanner } from '../NodeScanner';
import { StellarCoreVersion } from '../../../network/StellarCoreVersion';
import { NetworkQuorumSetConfiguration } from '../../../network/NetworkQuorumSetConfiguration';
import { NodeScannerCrawlStep } from '../NodeScannerCrawlStep';
import { NodeScannerHomeDomainStep } from '../NodeScannerHomeDomainStep';
import { NodeScannerTomlStep } from '../NodeScannerTomlStep';
import { NodeScannerHistoryArchiveStep } from '../NodeScannerHistoryArchiveStep';
import { NodeScannerGeoStep } from '../NodeScannerGeoStep';
import { NodeScannerIndexerStep } from '../NodeScannerIndexerStep';
import { NodeScan } from '../NodeScan';
import { err, ok } from 'neverthrow';
import { NodeScannerArchivalStep } from '../NodeScannerArchivalStep';

it('should perform a network scan', async function () {
	const crawlerStep = mock<NodeScannerCrawlStep>();
	const homeDomainStep = mock<NodeScannerHomeDomainStep>();
	const tomlStep = mock<NodeScannerTomlStep>();
	const historyArchiveStep = mock<NodeScannerHistoryArchiveStep>();
	const geoStep = mock<NodeScannerGeoStep>();
	const indexerStep = mock<NodeScannerIndexerStep>();
	const archivalStep = mock<NodeScannerArchivalStep>();

	crawlerStep.execute.mockResolvedValue(ok(undefined));

	const nodeScanner = new NodeScanner(
		crawlerStep,
		homeDomainStep,
		tomlStep,
		historyArchiveStep,
		geoStep,
		indexerStep,
		archivalStep,
		mock<Logger>()
	);

	const stellarCoreVersionOrError = StellarCoreVersion.create('1.0.0');
	if (stellarCoreVersionOrError.isErr())
		throw new Error('StellarCoreVersion.create failed');

	const nodeScan = mock<NodeScan>();
	const quorumSetConfig = new NetworkQuorumSetConfiguration(1, [
		createDummyPublicKey()
	]);

	const result = await nodeScanner.execute(
		nodeScan,
		quorumSetConfig,
		stellarCoreVersionOrError.value,
		[],
		BigInt(1),
		new Date(),
		[]
	);

	expect(crawlerStep.execute).toBeCalledTimes(1);
	expect(homeDomainStep.execute).toBeCalledTimes(1);
	expect(tomlStep.execute).toBeCalledTimes(1);
	expect(historyArchiveStep.execute).toBeCalledTimes(1);
	expect(geoStep.execute).toBeCalledTimes(1);
	expect(indexerStep.execute).toBeCalledTimes(1);
	expect(archivalStep.execute).toBeCalledTimes(1);
	expect(nodeScan.updateStellarCoreVersionBehindStatus).toBeCalledTimes(1);

	expect(result.isOk()).toBe(true);
});

it('should return an error if the crawling fails', async function () {
	const crawlerStep = mock<NodeScannerCrawlStep>();
	const homeDomainStep = mock<NodeScannerHomeDomainStep>();
	const tomlStep = mock<NodeScannerTomlStep>();
	const historyArchiveStep = mock<NodeScannerHistoryArchiveStep>();
	const geoStep = mock<NodeScannerGeoStep>();
	const indexerStep = mock<NodeScannerIndexerStep>();
	const archivalStep = mock<NodeScannerArchivalStep>();

	crawlerStep.execute.mockResolvedValue(err(new Error('Crawling failed')));

	const nodeScanner = new NodeScanner(
		crawlerStep,
		homeDomainStep,
		tomlStep,
		historyArchiveStep,
		geoStep,
		indexerStep,
		archivalStep,
		mock<Logger>()
	);

	const stellarCoreVersionOrError = StellarCoreVersion.create('1.0.0');
	if (stellarCoreVersionOrError.isErr())
		throw new Error('StellarCoreVersion.create failed');

	const nodeScan = new NodeScan(new Date(), []);
	const quorumSetConfig = new NetworkQuorumSetConfiguration(1, [
		createDummyPublicKey()
	]);

	const result = await nodeScanner.execute(
		nodeScan,
		quorumSetConfig,
		stellarCoreVersionOrError.value,
		[],
		BigInt(1),
		new Date(),
		[]
	);

	expect(crawlerStep.execute).toBeCalledTimes(1);

	expect(result.isOk()).toBe(false);
});
