import Kernel from '../../../../core/infrastructure/Kernel';
import { ConfigMock } from '../../../../core/config/__mocks__/configMock';
import { MockHistoryArchive } from '../../../infrastructure/http/MockHistoryArchive';
import { TYPES } from '../../../infrastructure/di/di-types';
import { ScanRepository } from '../../../domain/scan/ScanRepository';
import { Scan } from '../../../domain/scan/Scan';
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
