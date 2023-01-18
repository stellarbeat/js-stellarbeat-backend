import { StellarCoreVersion } from '../StellarCoreVersion';
it('should only create valid version strings', function () {
	const versionStringOrError = StellarCoreVersion.create('1.2.3');
	expect(versionStringOrError.isErr()).toBe(false);
	const invalidVersionStringOrError = StellarCoreVersion.create('v1.2.3');
	expect(invalidVersionStringOrError.isErr()).toBe(true);
	const longerVersionStringOrError = StellarCoreVersion.create('12.123.4322');
	expect(longerVersionStringOrError.isErr()).toBe(false);
	const versionStringWithLeadingZeroOrError =
		StellarCoreVersion.create('01.2.3');
	expect(versionStringWithLeadingZeroOrError.isErr()).toBe(true);
});
