import NodeQuorumSet from '../NodeQuorumSet';
import NodeGeoDataLocation from '../NodeGeoDataLocation';

export interface NodeScanResult {
	publicKey: string;
	quorumSet: NodeQuorumSet | null;
	quorumSetHash: string | null;
	ip: string | null;
	port: number | null;
	geoData: NodeGeoDataLocation | null;
	isp: string | null;
	participatingInSCP: boolean;
	isValidating: boolean;
	overLoaded: boolean;
	active: boolean;
	ledgerVersion: number | null;
	overlayVersion: number | null;
	overlayMinVersion: number | null;
	stellarCoreVersion: string | null;
	name: string | null;
	homeDomain: string | null;
	historyArchiveUrl: string | null;
	historyArchiveUpToDate: boolean | null;
	alias: string | null;
	host: string | null;
	historyArchiveHasError: boolean | null;
	index: number | null;
}
