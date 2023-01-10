import { Snapshot } from '../../../core/domain/Snapshot';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Network } from './Network';
import { OverlayVersionRange } from './OverlayVersionRange';
import { StellarCoreVersion } from './StellarCoreVersion';
import { QuorumSet } from '../QuorumSet';
import { plainToInstance } from 'class-transformer';

@Entity()
export class NetworkSnapshot extends Snapshot {
	@ManyToOne(() => Network)
	public network?: Network;

	@Column({ type: 'text', name: 'name', nullable: false })
	public name: string;

	@Column({ type: 'smallint', nullable: false })
	public maxLedgerVersion: number;

	@Column(() => OverlayVersionRange)
	public overlayVersionRange: OverlayVersionRange;

	@Column(() => StellarCoreVersion)
	public stellarCoreVersion: StellarCoreVersion;

	@Column({
		type: 'jsonb',
		nullable: false,
		name: 'quorumSet',
		transformer: {
			to: (value) => value,
			from: (value) => plainToInstance(QuorumSet, value)
		}
	})
	public quorumSetConfiguration: QuorumSet;

	@Column({ type: 'varchar', length: 64, nullable: false })
	public quorumSetConfigurationHash: string;

	constructor(
		startDate: Date,
		name: string,
		maxLedgerVersion: number,
		overlayVersionRange: OverlayVersionRange,
		stellarCoreVersion: StellarCoreVersion,
		quorumSetConfiguration: QuorumSet,
		quorumSetConfigurationHash: string
	) {
		super(startDate);
		this.name = name;
		this.maxLedgerVersion = maxLedgerVersion;
		this.overlayVersionRange = overlayVersionRange;
		this.stellarCoreVersion = stellarCoreVersion;
		this.quorumSetConfiguration = quorumSetConfiguration;
		this.quorumSetConfigurationHash = quorumSetConfigurationHash;
	}

	copy(startDate: Date): this {
		return new NetworkSnapshot(
			startDate,
			this.name,
			this.maxLedgerVersion,
			this.overlayVersionRange,
			this.stellarCoreVersion,
			this.quorumSetConfiguration,
			this.quorumSetConfigurationHash
		) as this;
	}
}
