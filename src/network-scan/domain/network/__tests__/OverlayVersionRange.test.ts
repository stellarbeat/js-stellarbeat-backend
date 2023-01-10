import { OverlayVersionRange } from '../OverlayVersionRange';

it('should equal other OverlayVersionRange', function () {
	const overlayVersionRangeOrError = OverlayVersionRange.create(1, 2);
	if (overlayVersionRangeOrError.isErr())
		throw overlayVersionRangeOrError.error;
	const otherOverlayVersionRangeOrError = OverlayVersionRange.create(1, 2);
	if (otherOverlayVersionRangeOrError.isErr())
		throw otherOverlayVersionRangeOrError.error;
	expect(
		overlayVersionRangeOrError.value.equals(
			otherOverlayVersionRangeOrError.value
		)
	).toBe(true);
});

it('should not create OverlayVersionRange with minVersion greater than maxVersion', function () {
	const overlayVersionRangeOrError = OverlayVersionRange.create(2, 1);
	expect(overlayVersionRangeOrError.isErr()).toBe(true);
});
