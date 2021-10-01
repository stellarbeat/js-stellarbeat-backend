import { Entity, Column } from 'typeorm';

@Entity()
export default class NetworkMeasurementMonth {
	@Column('date', { primary: true, name: 'time' })
	time: Date = new Date();

	@Column('int', { default: 0 })
	nrOfActiveWatchersSum: number = 0;

	@Column('int', { default: 0 })
	nrOfActiveValidatorsSum: number = 0; //validators that are validating

	@Column('int', { default: 0 })
	nrOfActiveFullValidatorsSum: number = 0;

	@Column('int', { default: 0 })
	nrOfActiveOrganizationsSum: number = 0;

	@Column('int', { default: 0 })
	transitiveQuorumSetSizeSum: number = 0;

	@Column('smallint', { default: 0 })
	hasQuorumIntersectionCount: number = 0;

	@Column('smallint', { default: 0 })
	hasTransitiveQuorumSetCount: number = 0;

	@Column('smallint', { default: 0 })
	hasSymmetricTopTierCount: number = 0;

	@Column('smallint', { default: 0 })
	topTierMin: number = 0;

	@Column('smallint', { default: 0 })
	topTierMax: number = 0;

	@Column('int', { default: 0 })
	topTierSum: number = 0;

	@Column('smallint', { default: 0 })
	topTierOrgsMin: number = 0;

	@Column('smallint', { default: 0 })
	topTierOrgsMax: number = 0;

	@Column('int', { default: 0 })
	topTierOrgsSum: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetMin: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetMax: number = 0;

	@Column('int', { default: 0 })
	minBlockingSetSum: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetOrgsMin: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetOrgsMax: number = 0;

	@Column('int', { default: 0 })
	minBlockingSetOrgsSum: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetFilteredMin: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetFilteredMax: number = 0;

	@Column('int', { default: 0 })
	minBlockingSetFilteredSum: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetOrgsFilteredMin: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetOrgsFilteredMax: number = 0;

	@Column('int', { default: 0 })
	minBlockingSetOrgsFilteredSum: number = 0;

	@Column('smallint', { default: 0 })
	minSplittingSetMin: number = 0;

	@Column('smallint', { default: 0 })
	minSplittingSetMax: number = 0;

	@Column('int', { default: 0 })
	minSplittingSetSum: number = 0;

	@Column('smallint', { default: 0 })
	minSplittingSetOrgsMin: number = 0;

	@Column('smallint', { default: 0 })
	minSplittingSetOrgsMax: number = 0;

	@Column('int', { default: 0 })
	minSplittingSetOrgsSum: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetCountryMin: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetCountryMax: number = 0;

	@Column('int', { default: 0 })
	minBlockingSetCountrySum: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetCountryFilteredMin: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetCountryFilteredMax: number = 0;

	@Column('int', { default: 0 })
	minBlockingSetCountryFilteredSum: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetISPMin: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetISPMax: number = 0;

	@Column('int', { default: 0 })
	minBlockingSetISPSum: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetISPFilteredMin: number = 0;

	@Column('smallint', { default: 0 })
	minBlockingSetISPFilteredMax: number = 0;

	@Column('int', { default: 0 })
	minBlockingSetISPFilteredSum: number = 0;

	@Column('smallint', { default: 0 })
	minSplittingSetCountryMin: number = 0;

	@Column('smallint', { default: 0 })
	minSplittingSetCountryMax: number = 0;

	@Column('int', { default: 0 })
	minSplittingSetCountrySum: number = 0;

	@Column('smallint', { default: 0 })
	minSplittingSetISPMin: number = 0;

	@Column('smallint', { default: 0 })
	minSplittingSetISPMax: number = 0;

	@Column('int', { default: 0 })
	minSplittingSetISPSum: number = 0;

	@Column('smallint', { default: 0 })
	crawlCount: number = 0;
}
