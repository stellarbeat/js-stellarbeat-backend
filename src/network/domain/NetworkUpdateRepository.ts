import NetworkUpdate from './NetworkUpdate';

export interface NetworkUpdateRepository {
	findLatest(): Promise<NetworkUpdate | undefined>;

	findAt(at: Date): Promise<NetworkUpdate | undefined>;

	findPreviousAt(at: Date): Promise<NetworkUpdate | undefined>;

	save(networkUpdate: NetworkUpdate): Promise<void>;
}
