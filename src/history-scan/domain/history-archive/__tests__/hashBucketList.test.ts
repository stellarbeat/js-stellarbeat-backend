import { hashBucketList } from '../hashBucketList';
import { getDummyHistoryArchiveState } from '../__fixtures__/getDummyHistoryArchiveState';

it('should hash correctly', function () {
	const result = hashBucketList(getDummyHistoryArchiveState());
	expect(result.isOk()).toBeTruthy();
	if (result.isErr()) throw result.error;

	expect(result.value.ledger).toEqual(40351615);
	expect(result.value.hash).toEqual(
		'vtRf4YP8qFhI3d7AtxQsgMM1AJ60P/6e35Brm4UKJPs='
	);
});
