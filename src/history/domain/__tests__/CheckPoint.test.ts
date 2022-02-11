import { createDummyHistoryBaseUrl } from '../__fixtures__/HistoryBaseUrl';
import { CheckPoint } from '../CheckPoint';

it('should have ledger that is multiple of 64 minus 1', function () {
	expect(new CheckPoint(32, createDummyHistoryBaseUrl()).ledger).toEqual(63);
	expect(new CheckPoint(63, createDummyHistoryBaseUrl()).ledger).toEqual(63);
	expect(new CheckPoint(64, createDummyHistoryBaseUrl()).ledger).toEqual(127);
});
