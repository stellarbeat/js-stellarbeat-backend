import Kernel from '../../../../shared/core/Kernel';
import { ConfigMock } from '../../../../config/__mocks__/configMock';
import { MockHistoryArchive } from '../../../infrastructure/http/MockHistoryArchive';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { NetworkWriteRepository } from '../../../../network/repositories/NetworkWriteRepository';
import NetworkUpdate from '../../../../network-update/domain/NetworkUpdate';
import { TYPES } from '../../../infrastructure/di/di-types';
import { ScanRepository } from '../../../domain/history-archive-scan/ScanRepository';
import { Scan } from '../../../domain/history-archive-scan/Scan';
import { VerifyArchives } from '../VerifyArchives';

let kernel: Kernel;
const mockHistoryArchive: MockHistoryArchive = new MockHistoryArchive();
let verifyArchives: VerifyArchives;
jest.setTimeout(60000); //slow integration tests
beforeAll(async () => {
	kernel = await Kernel.getInstance(new ConfigMock());
	await mockHistoryArchive.listen(80);
	verifyArchives = kernel.container.get(VerifyArchives);
});

afterAll(async () => {
	await mockHistoryArchive.stop();
	await kernel.close();
});

it('should scan all known archives', async function () {
	const node = new Node('A');
	node.active = true;
	node.historyUrl = 'http://127.0.0.1';

	const network = new Network([node]);
	await kernel.container
		.get(NetworkWriteRepository)
		.save(new NetworkUpdate(), network);

	await verifyArchives.execute({
		persist: true,
		loop: false
	});

	const historyArchiveScanRepository: ScanRepository = kernel.container.get(
		TYPES.HistoryArchiveScanRepository
	);
	const scan = (await historyArchiveScanRepository.findLatestByUrl(
		'http://127.0.0.1'
	)) as Scan;

	expect(scan).toBeInstanceOf(Scan);
	expect(scan.endDate).toBeDefined();
	expect(scan.hasError()).toBeFalsy();
	expect(scan.latestScannedLedger).toEqual(127);
	expect(scan.latestScannedLedgerHeaderHash).toEqual(
		'7XqhM1busGfKYJi/v/lHL/IDp/h/6TMLTDxYwKu88QA='
	);
});