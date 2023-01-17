import { ValidatingIndex } from './index/validating-index';
import { TypeIndex } from './index/type-index';
import { ActiveIndex } from './index/active-index';
import { VersionIndex } from './index/version-index';
import { AgeIndex } from './index/age-index';
import { TrustIndex } from './index/trust-index';
import { TrustGraph } from '@stellarbeat/js-stellar-domain';

export interface IndexNode {
	publicKey: string;
	version: string;
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
		highestVersion: string
	): Map<string, number> {
		//index two digits after comma
		const result = new Map<string, number>();
		nodes.forEach((node) => {
			result.set(
				node.publicKey,
				Number(
					(
						(TypeIndex.get(node.hasUpToDateHistoryArchive, node.isValidating) +
							ActiveIndex.get(node.isActive30DaysPercentage) +
							ValidatingIndex.get(node.validating30DaysPercentage) +
							VersionIndex.get(node.stellarCoreVersion, highestVersion) +
							TrustIndex.get(node.publicKey, trustGraph) +
							AgeIndex.get(node.dateDiscovered)) /
						6
					).toFixed(2)
				)
			);
		});
		return result;
	}
}
