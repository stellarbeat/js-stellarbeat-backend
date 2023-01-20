import NodeQuorumSet from '../NodeQuorumSet';
import NodeGeoDataLocation from '../NodeGeoDataLocation';

export interface NodeScanMeasurement {
	publicKey: string;
	participatingInSCP: boolean;
	isValidating: boolean;
	overLoaded: boolean;
	active: boolean;
	historyArchiveUpToDate: boolean | null;
	historyArchiveHasError: boolean | null;
	index: number | null;
}

export interface NodeScanProps {
	publicKey: string;
	quorumSet: NodeQuorumSet | null;
	quorumSetHash: string | null;
	ip: string | null;
	port: number | null;
	geoData: NodeGeoDataLocation | null;
	isp: string | null;
	ledgerVersion: number | null;
	overlayVersion: number | null;
	overlayMinVersion: number | null;
	stellarCoreVersion: string | null;
	name: string | null;
	homeDomain: string | null;
	historyArchiveUrl: string | null;
	alias: string | null;
	host: string | null;
}
