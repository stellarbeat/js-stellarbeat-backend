import Node from '../../../node/Node';
import Organization from '../../../organization/Organization';
import {
	FbasAnalysisNode,
	FbasAnalysisOrganization
} from './FbasAnalyzerFacade';

export class FbasMapper {
	static mapToFbasAnalysisNode(node: Node): FbasAnalysisNode {
		return {
			publicKey: node.publicKey.value,
			name: node.details?.name ?? null,
			quorumSet: node.quorumSet?.quorumSet ?? null,
			geoData: {
				countryName: node.geoData?.countryName ?? null
			},
			isp: node.isp
		};
	}

	static mapToFbasAnalysisOrganization(
		organization: Organization
	): FbasAnalysisOrganization {
		return {
			id: organization.organizationId.value,
			validators: organization.validators.value.map(
				(validator) => validator.value
			),
			name: organization.name
		};
	}

	static mapToAnalysisResult() {}
}
