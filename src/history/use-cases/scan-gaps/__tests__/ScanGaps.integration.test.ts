import Kernel from '../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { ScanGaps } from '../ScanGaps';
import { MockHistoryArchive } from '../../../infrastructure/http/MockHistoryArchive';
import { HistoryArchiveScanRepository } from '../../../domain/history-archive-scan/HistoryArchiveScanRepository';
import { HistoryArchiveScan } from '../../../domain/history-archive-scan/HistoryArchiveScan';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { NetworkWriteRepository } from '../../../../network/repositories/NetworkWriteRepository';
import { Ok, Err } from 'neverthrow';
import NetworkUpdate from '../../../../network-update/domain/NetworkUpdate';

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

	const historyArchiveScanRepository: HistoryArchiveScanRepository =
		kernel.container.get('HistoryArchiveScanRepository');
	const scan = await historyArchiveScanRepository.findLatestByUrl(
		'http://127.0.0.1'
	);

	expect(scan).toBeInstanceOf(HistoryArchiveScan);
	expect((scan as HistoryArchiveScan).endDate).toBeDefined();
}

it('should scan specific history archive for gaps', async function () {
	const result = await scanGaps.execute({
		toLedger: 1000,
		fromLedger: 0,
		concurrency: 50,
		historyUrl: 'http://127.0.0.1',
		persist: true,
		loop: false
	});

	await verifyCorrectScan(result);
});

it('should return error when no history archives', async function () {
	const result = await scanGaps.execute({
		concurrency: 50,
		persist: true,
		loop: false
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
		concurrency: 50,
		persist: true,
		loop: false
	});

	await verifyCorrectScan(result);
});
