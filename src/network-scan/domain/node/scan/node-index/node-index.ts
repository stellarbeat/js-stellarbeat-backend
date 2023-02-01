import { ValidatingIndex } from './index/validating-index';
import { TypeIndex } from './index/type-index';
import { ActiveIndex } from './index/active-index';
import { VersionIndex } from './index/version-index';
import { AgeIndex } from './index/age-index';
import { TrustIndex } from './index/trust-index';
import { TrustGraph } from '@stellarbeat/js-stellarbeat-shared';

export interface IndexNode {
	publicKey: string;
	isActive30DaysPercentage: number;
	hasUpToDateHistoryArchive: boolean;
	isValidating: boolean;
	stellarCoreVersion: string;
	dateDiscovered: Date;
	validating30DaysPercentage: number;
}

export class NodeIndex {
	static calculateIndexes(
		nodes: IndexNode[],
		trustGraph: TrustGraph,
		currentStellarCoreVersion: string
	): Map<string, number> {
		//index two digits after comma
		const result = new Map<string, number>();
		nodes.forEach((node) => {
			const indexRaw =
				(TypeIndex.get(node.hasUpToDateHistoryArchive, node.isValidating) +
					ActiveIndex.get(node.isActive30DaysPercentage) +
					ValidatingIndex.get(node.validating30DaysPercentage) +
					VersionIndex.get(node.stellarCoreVersion, currentStellarCoreVersion) +
					TrustIndex.get(node.publicKey, trustGraph) +
					AgeIndex.get(node.dateDiscovered)) /
				6;

			const indexToFixed = Number(indexRaw.toFixed(2));
			const index = Math.floor(indexToFixed * 100);
			//floating point precision issues e.g 0.28 * 100 = 28.000000000000004
			result.set(node.publicKey, index);
		});
		return result;
	}
}
