import { QuorumSet } from './QuorumSet';
import { QuorumSet as BasicQuorumSet } from '@stellarbeat/js-stellarbeat-shared/lib/quorum-set';

export class QuorumSetMapper {
	static toBaseQuorumSet(quorumSet: QuorumSet): BasicQuorumSet {
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
