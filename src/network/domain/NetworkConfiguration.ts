import { Column } from 'typeorm';
import { ValueObject } from '../../core/domain/ValueObject';
import { QuorumSet } from './QuorumSet';

export class NetworkConfiguration extends ValueObject {
	@Column({ type: 'smallint', nullable: false })
	public readonly ledgerVersion: number;

	@Column({ type: 'smallint', nullable: false })
	public readonly overlayMinVersion: number;

	@Column({ type: 'smallint', nullable: false })
	public readonly overlayVersion: number;

	@Column({ type: 'varchar', nullable: false })
	public readonly versionString: string;

	@Column({ type: 'jsonb', nullable: false })
	public readonly quorumSet: QuorumSet;

	@Column({ type: 'varchar', length: 64, nullable: false })
	private readonly quorumSetHash: string;

	private constructor(
		ledgerVersion: number,
		overlayMinVersion: number,
		overlayVersion: number,
		versionString: string,
		quorumSet: QuorumSet,
		quorumSetHash: string
	) {
		super();
		this.ledgerVersion = ledgerVersion;
		this.overlayMinVersion = overlayMinVersion;
		this.overlayVersion = overlayVersion;
		this.versionString = versionString;
		this.quorumSet = quorumSet;
		this.quorumSetHash = quorumSetHash;
	}

	static create(
		ledgerVersion: number,
		overlayMinVersion: number,
		overlayVersion: number,
		versionString: string,
		quorumSet: QuorumSet
	) {
		return new NetworkConfiguration(
			ledgerVersion,
			overlayMinVersion,
			overlayVersion,
			versionString,
			quorumSet,
			quorumSet.hash()
		);
	}

	equals(other: this): boolean {
		return (
			this.ledgerVersion === other.ledgerVersion &&
			this.overlayMinVersion === other.overlayMinVersion &&
			this.overlayVersion === other.overlayVersion &&
			this.versionString === other.versionString &&
			this.quorumSetHash === other.quorumSetHash
		);
	}
}
