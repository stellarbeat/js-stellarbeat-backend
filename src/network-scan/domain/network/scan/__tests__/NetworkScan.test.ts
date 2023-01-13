import NetworkScan from '../NetworkScan';

test('networkScan', () => {
	const date = new Date();
	const networkScan = new NetworkScan(date, [1]);

	expect(networkScan.ledgers).toEqual([1]);
	expect(networkScan.time).toEqual(date);
	expect(networkScan.latestLedger).toEqual(BigInt(0));
	expect(networkScan.latestLedgerCloseTime.getTime()).toEqual(
		new Date(0).getTime()
	);
});
