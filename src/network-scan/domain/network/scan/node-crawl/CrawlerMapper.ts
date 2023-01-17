import { QuorumSet } from '../../QuorumSet';
import { QuorumSet as CrawlerQuorumSet } from '@stellarbeat/js-stellar-domain';

export class CrawlerMapper {
	static toQuorumSetDTO(quorumSet: QuorumSet): CrawlerQuorumSet {
		const crawlerQuorumSet = new CrawlerQuorumSet();
		crawlerQuorumSet.validators = quorumSet.validators.map(
			(validator) => validator.value
		);
		crawlerQuorumSet.threshold = quorumSet.threshold;
		crawlerQuorumSet.innerQuorumSets = quorumSet.innerQuorumSets.map(
			(innerQuorumSet) => this.toQuorumSetDTO(innerQuorumSet)
		);

		return crawlerQuorumSet;
	}
}
