import { createDummyHistoryBaseUrl } from '../__fixtures__/HistoryBaseUrl';
import { CheckPoint } from '../CheckPoint';

it('should have ledger that is multiple of 64 minus 1', function () {
	expect(new CheckPoint(32, createDummyHistoryBaseUrl()).ledger).toEqual(63);
	expect(new CheckPoint(63, createDummyHistoryBaseUrl()).ledger).toEqual(63);
	expect(new CheckPoint(64, createDummyHistoryBaseUrl()).ledger).toEqual(127);
});

it('should generate correct bucket url', function () {
	expect(
		new CheckPoint(39279103, createDummyHistoryBaseUrl()).getBucketUrl(
			'bd96d76dec3196938aa7acb8116ddb5e442201032ab32dfb5af30fb8563c04d5'
		).value
	).toEqual(
		createDummyHistoryBaseUrl().value +
			'/bucket/bd/96/d7/bucket-bd96d76dec3196938aa7acb8116ddb5e442201032ab32dfb5af30fb8563c04d5.xdr.gz'
	);
});
