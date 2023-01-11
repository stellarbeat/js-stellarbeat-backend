export interface UpdateNetworkDTO {
	time: Date;
	name: string;
	networkId: string;
	passphrase: string;
	networkQuorumSet: Array<string | string[]>;
	overlayVersion: number;
	overlayMinVersion: number;
	ledgerVersion: number;
	stellarCoreVersion: string;
}
