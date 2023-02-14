import { NetworkQuorumSetConfiguration } from './NetworkQuorumSetConfiguration';
import { QuorumSet as BasicQuorumSet } from '@stellarbeat/js-stellarbeat-shared/lib/quorum-set';

export class NetworkQuorumSetConfigurationMapper {
	static toBaseQuorumSet(
		quorumSet: NetworkQuorumSetConfiguration
	): BasicQuorumSet {
		const crawlerQuorumSet = new BasicQuorumSet();
		crawlerQuorumSet.validators = quorumSet.validators.map(
			(validator) => validator.value
		);
		crawlerQuorumSet.threshold = quorumSet.threshold;
		crawlerQuorumSet.innerQuorumSets = quorumSet.innerQuorumSets.map(
			(innerQuorumSet) => this.toBaseQuorumSet(innerQuorumSet)
		);

		return crawlerQuorumSet;
	}
}
