import { Entity, Column } from 'typeorm';
import { Measurement } from '../measurement/Measurement';

/**
 * See https://arxiv.org/pdf/2002.08101.pdf for more explanation of top tier, splitting & blocking sets
 */
@Entity()
export default class NetworkMeasurement implements Measurement {
	@Column('timestamptz', { primary: true })
	time: Date;

	@Column('smallint', { default: 0 })
	nrOfActiveWatchers = 0;

	@Column('smallint', { default: 0 })
	nrOfActiveValidators = 0; //validators that are validating

	@Column('smallint', { default: 0 })
	nrOfActiveFullValidators = 0;

	@Column('smallint', { default: 0 })
	nrOfActiveOrganizations = 0;

	@Column('smallint', { default: 0 })
	transitiveQuorumSetSize = 0;

	@Column('bool', { default: false })
	hasTransitiveQuorumSet = false;

	@Column('smallint', { default: 0 })
	topTierSize = 0;

	@Column('smallint', { default: 0 })
	topTierOrgsSize = 0;

	@Column('bool', { default: false })
	hasSymmetricTopTier = false;

	@Column('bool', { default: false })
	hasQuorumIntersection = false;

	//smallest blocking set size
	@Column('smallint', { default: 0 })
	minBlockingSetSize = 0;

	//smallest blocking set size without failing nodes
	@Column('smallint', { default: 0 })
	minBlockingSetFilteredSize = 0;

	//smallest blocking set size grouped by organizations
	@Column('smallint', { default: 0 })
	minBlockingSetOrgsSize = 0;

	//smallest blocking set size without failing nodes grouped by organizations
	@Column('smallint', { default: 0 })
	minBlockingSetOrgsFilteredSize = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetCountrySize = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetCountryFilteredSize = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetISPSize = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetISPFilteredSize = 0;

	//smallest splitting set size
	@Column('smallint', { default: 0 })
	minSplittingSetSize = 0;

	//smallest splitting set size grouped by organizations
	@Column('smallint', { default: 0 })
	minSplittingSetOrgsSize = 0;

	//smallest splitting set size grouped by organizations
	@Column('smallint', { default: 0 })
	minSplittingSetCountrySize = 0;

	//smallest splitting set size grouped by organizations
	@Column('smallint', { default: 0 })
	minSplittingSetISPSize = 0;

	constructor(time: Date) {
		this.time = time;
	}
}
