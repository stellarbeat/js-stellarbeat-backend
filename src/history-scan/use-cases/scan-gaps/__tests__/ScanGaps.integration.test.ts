import Kernel from '../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { ScanGaps } from '../ScanGaps';
import { MockHistoryArchive } from '../../../infrastructure/http/MockHistoryArchive';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { NetworkWriteRepository } from '../../../../network/repositories/NetworkWriteRepository';
import { Ok, Err } from 'neverthrow';
import NetworkUpdate from '../../../../network-update/domain/NetworkUpdate';
import { TYPES } from '../../../infrastructure/di/di-types';
import { ScanRepository } from '../../../domain/history-archive-scan/ScanRepository';
import { Scan } from '../../../domain/history-archive-scan/Scan';

let kernel: Kernel;
const mockHistoryArchive: MockHistoryArchive = new MockHistoryArchive();
let scanGaps: ScanGaps;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	await mockHistoryArchive.listen(80);
	scanGaps = kernel.container.get(ScanGaps);
});

afterAll(async () => {
	await mockHistoryArchive.stop();
	await kernel.close();
});

async function verifyCorrectScan(result: Ok<void, Error> | Err<void, Error>) {
	expect(result.isOk()).toBeTruthy();

	const historyArchiveScanRepository: ScanRepository = kernel.container.get(
		TYPES.HistoryArchiveScanRepository
	);
	const scan = await historyArchiveScanRepository.findLatestByUrl(
		'http://127.0.0.1'
	);

	expect(scan).toBeInstanceOf(Scan);
	expect((scan as Scan).endDate).toBeDefined();
}

it('should scan specific history archive for gaps', async function () {
	const result = await scanGaps.execute({
		toLedger: 1000,
		fromLedger: 0,
		historyUrl: 'http://127.0.0.1',
		persist: true,
		loop: false,
		maxConcurrency: 1
	});

	await verifyCorrectScan(result);
});

it('should return error when no history archives', async function () {
	const result = await scanGaps.execute({
		persist: true,
		loop: false,
		maxConcurrency: 1
	});

	expect(result.isErr()).toBeTruthy();
});

it('should scan all known archives', async function () {
	const node = new Node('A');
	node.active = true;
	node.historyUrl = 'http://127.0.0.1';

	const network = new Network([node]);
	await kernel.container
		.get(NetworkWriteRepository)
		.save(new NetworkUpdate(), network);

	const result = await scanGaps.execute({
		maxConcurrency: 50,
		persist: true,
		loop: false
	});

	await verifyCorrectScan(result);
});
