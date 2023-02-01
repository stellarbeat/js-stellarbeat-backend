import { mock } from 'jest-mock-extended';
import { Logger } from '../../../../../core/services/PinoLogger';
import { createDummyPublicKey } from '../../__fixtures__/createDummyPublicKey';
import { NodeScanner } from '../NodeScanner';
import { StellarCoreVersion } from '../../../network/StellarCoreVersion';
import { QuorumSet } from '../../../network/QuorumSet';
import { NodeScannerCrawlStep } from '../NodeScannerCrawlStep';
import { NodeScannerHomeDomainStep } from '../NodeScannerHomeDomainStep';
import { NodeScannerTomlStep } from '../NodeScannerTomlStep';
import { NodeScannerHistoryArchiveStep } from '../NodeScannerHistoryArchiveStep';
import { NodeScannerGeoStep } from '../NodeScannerGeoStep';
import { NodeScannerIndexerStep } from '../NodeScannerIndexerStep';
import { NodeScan } from '../NodeScan';
import { err, ok } from 'neverthrow';

it('should perform a network scan', async function () {
	const crawlerStep = mock<NodeScannerCrawlStep>();
	const homeDomainStep = mock<NodeScannerHomeDomainStep>();
	const tomlStep = mock<NodeScannerTomlStep>();
	const historyArchiveStep = mock<NodeScannerHistoryArchiveStep>();
	const geoStep = mock<NodeScannerGeoStep>();
	const indexerStep = mock<NodeScannerIndexerStep>();

	crawlerStep.execute.mockResolvedValue(ok(undefined));

	const nodeScanner = new NodeScanner(
		crawlerStep,
		homeDomainStep,
		tomlStep,
		historyArchiveStep,
		geoStep,
		indexerStep,
		mock<Logger>()
	);

	const stellarCoreVersionOrError = StellarCoreVersion.create('1.0.0');
	if (stellarCoreVersionOrError.isErr())
		throw new Error('StellarCoreVersion.create failed');

	const nodeScan = new NodeScan(new Date(), []);
	const quorumSetConfig = new QuorumSet(1, [createDummyPublicKey()]);

	const result = await nodeScanner.execute(
		nodeScan,
		quorumSetConfig,
		stellarCoreVersionOrError.value,
		[],
		BigInt(1),
		new Date()
	);

	expect(crawlerStep.execute).toBeCalledTimes(1);
	expect(homeDomainStep.execute).toBeCalledTimes(1);
	expect(tomlStep.execute).toBeCalledTimes(1);
	expect(historyArchiveStep.execute).toBeCalledTimes(1);
	expect(geoStep.execute).toBeCalledTimes(1);
	expect(indexerStep.execute).toBeCalledTimes(1);

	expect(result.isOk()).toBe(true);
});

it('should return an error if the crawling fails', async function () {
	const crawlerStep = mock<NodeScannerCrawlStep>();
	const homeDomainStep = mock<NodeScannerHomeDomainStep>();
	const tomlStep = mock<NodeScannerTomlStep>();
	const historyArchiveStep = mock<NodeScannerHistoryArchiveStep>();
	const geoStep = mock<NodeScannerGeoStep>();
	const indexerStep = mock<NodeScannerIndexerStep>();

	crawlerStep.execute.mockResolvedValue(err(new Error('Crawling failed')));

	const nodeScanner = new NodeScanner(
		crawlerStep,
		homeDomainStep,
		tomlStep,
		historyArchiveStep,
		geoStep,
		indexerStep,
		mock<Logger>()
	);

	const stellarCoreVersionOrError = StellarCoreVersion.create('1.0.0');
	if (stellarCoreVersionOrError.isErr())
		throw new Error('StellarCoreVersion.create failed');

	const nodeScan = new NodeScan(new Date(), []);
	const quorumSetConfig = new QuorumSet(1, [createDummyPublicKey()]);

	const result = await nodeScanner.execute(
		nodeScan,
		quorumSetConfig,
		stellarCoreVersionOrError.value,
		[],
		BigInt(1),
		new Date()
	);

	expect(crawlerStep.execute).toBeCalledTimes(1);

	expect(result.isOk()).toBe(false);
});
