import { Scan } from './Scan';

export interface ScanRepository {
	save(scans: Scan[]): Promise<Scan[]>;
	findLatestByUrl(url: string): Promise<Scan | null>;
	findLatest(): Promise<Scan[]>;
}
