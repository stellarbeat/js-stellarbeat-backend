import NetworkUpdate from '../NetworkUpdate';

test('networkUpdate', () => {
	const date = new Date();
	const networkUpdate = new NetworkUpdate(date, [1]);

	expect(networkUpdate.ledgers).toEqual([1]);
	expect(networkUpdate.time).toEqual(date);
	expect(networkUpdate.latestLedger).toEqual(BigInt(0));
	expect(networkUpdate.latestLedgerCloseTime.getTime()).toEqual(
		new Date(0).getTime()
	);
});
