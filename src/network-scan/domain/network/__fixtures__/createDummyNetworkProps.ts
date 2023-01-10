import { NetworkProps } from '../Network';
import { OverlayVersionRange } from '../OverlayVersionRange';
import { StellarCoreVersion } from '../StellarCoreVersion';
import { createDummyQuorumSet } from './createDummyQuorumSet';

export function createDummyNetworkProps(): NetworkProps {
	const overlayVersionRangeOrError = OverlayVersionRange.create(1, 2);
	if (overlayVersionRangeOrError.isErr())
		throw overlayVersionRangeOrError.error;
	const stellarCoreVersionStringOrError = StellarCoreVersion.create('1.0.0');
	if (stellarCoreVersionStringOrError.isErr())
		throw stellarCoreVersionStringOrError.error;
	const quorumSet = createDummyQuorumSet();

	return {
		name: 'my test network',
		maxLedgerVersion: 1,
		overlayVersionRange: overlayVersionRangeOrError.value,
		stellarCoreVersion: stellarCoreVersionStringOrError.value,
		quorumSetConfiguration: quorumSet
	};
}
