import { Column } from 'typeorm';

export class NetworkConfiguration {
	@Column({ type: 'smallint', nullable: false })
	public readonly ledgerVersion: number;

	@Column({ type: 'smallint', nullable: false })
	public readonly overlayMinVersion: number;

	@Column({ type: 'smallint', nullable: false })
	public readonly overlayVersion: number;

	@Column({ type: 'varchar', nullable: false })
	public readonly versionString: string;

	constructor(
		ledgerVersion: number,
		overlayMinVersion: number,
		overlayVersion: number,
		versionString: string
	) {
		this.ledgerVersion = ledgerVersion;
		this.overlayMinVersion = overlayMinVersion;
		this.overlayVersion = overlayVersion;
		this.versionString = versionString;
	}
}
