import { getConfigFromEnv, parseNetworkConfig } from '../Config';

describe('Config', function () {
	describe('S3Region', function () {
		test('should set correct region', function () {
			process.env.ENABLE_S3_BACKUP = 'true';
			process.env.AWS_REGION = 'region';
			const config = getConfigFromEnv();
			expect(config.isOk()).toBe(true);
			if (!config.isOk()) throw config.error;
			expect(config.value.s3Region).toEqual('region');
		});
	});

	describe('test networkScanLoopIntervalMs', function () {
		test('set correct value through number string', function () {
			process.env.NETWORK_SCAN_LOOP_INTERVAL_MS = '1000';
			const config = getConfigFromEnv();
			expect(config.isOk()).toBe(true);
			if (!config.isOk()) throw config.error;

			expect(config.value.networkScanLoopIntervalMs).toEqual(1000);
		});

		test('undefined if not set', function () {
			process.env.NETWORK_SCAN_LOOP_INTERVAL_MS = undefined;

			const config = getConfigFromEnv();
			expect(config.isOk()).toBe(true);
			if (!config.isOk()) throw config.error;

			expect(config.value.networkScanLoopIntervalMs).toBeUndefined();
		});
	});

	describe('parseNetworkConfig', function () {
		beforeEach(() => {
			jest.resetModules();
			process.env = {};
		});

		test('should return correct network config', function () {
			setupCorrectNetworkConfig();
			const result = parseNetworkConfig();
			if (!result.isOk()) throw result.error;
			expect(result.isOk()).toBe(true);
			const networkConfig = result.value;
			expect(networkConfig.knownPeers).toEqual(['B']);
			expect(networkConfig.ledgerVersion).toEqual(0);
			expect(networkConfig.stellarCoreVersion).toEqual('0.0.0');
			expect(networkConfig.networkPassphrase).toEqual('passphrase');
			expect(networkConfig.networkId).toEqual('id');
			expect(networkConfig.networkName).toEqual('name');
			expect(networkConfig.overlayMinVersion).toEqual(1);
			expect(networkConfig.overlayVersion).toEqual(2);
			expect(networkConfig.quorumSet).toEqual(['A']);
		});

		test('should return error if network config is not defined', function () {
			const result = parseNetworkConfig();
			expect(result.isErr()).toBe(true);
		});

		function setupCorrectNetworkConfig(): void {
			process.env.NETWORK_KNOWN_PEERS = '["B"]';
			process.env.NETWORK_LEDGER_VERSION = '0';
			process.env.NETWORK_STELLAR_CORE_VERSION = '0.0.0';
			process.env.NETWORK_PASSPHRASE = 'passphrase';
			process.env.NETWORK_ID = 'id';
			process.env.NETWORK_NAME = 'name';
			process.env.NETWORK_OVERLAY_MIN_VERSION = '1';
			process.env.NETWORK_OVERLAY_VERSION = '2';
			process.env.NETWORK_QUORUM_SET = '["A"]';
		}
	});
});
