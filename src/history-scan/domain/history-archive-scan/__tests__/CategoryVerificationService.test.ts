import { CategoryVerificationService } from '../CategoryVerificationService';

it('should get lowest ledger', function () {
	const lowestLedger = CategoryVerificationService.getLowestLedger(
		new Map([
			[4, {}],
			[1, {}],
			[2, {}],
			[3, {}]
		] as any)
	);

	expect(lowestLedger).toBe(1);
});
