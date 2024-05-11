import { NodeV1 } from '@stellarbeat/js-stellarbeat-shared';
import { createDummyPublicKeyString } from '../../domain/node/__fixtures__/createDummyPublicKey';

export function createDummyNodeV1(
	publicKey = createDummyPublicKeyString()
): NodeV1 {
	return {
		publicKey: publicKey,
		active: true,
		ip: 'localhost',
		port: 1234,
		name: 'name',
		host: 'host',
		ledgerVersion: 1,
		overlayVersion: 1,
		overlayMinVersion: 1,
		versionStr: 'versionStr',
		quorumSet: null,
		quorumSetHashKey: 'quorumSetHashKey',
		activeInScp: true,
		geoData: null,
		statistics: {
			active30DaysPercentage: 1,
			overLoaded30DaysPercentage: 1,
			validating30DaysPercentage: 1,
			active24HoursPercentage: 1,
			overLoaded24HoursPercentage: 1,
			validating24HoursPercentage: 1,
			has24HourStats: true,
			has30DayStats: true
		},
		dateDiscovered: new Date().toISOString(),
		dateUpdated: new Date().toISOString(),
		overLoaded: true,
		isFullValidator: true,
		isValidating: true,
		homeDomain: 'homeDomain',
		index: 1,
		historyUrl: 'historyUrl',
		alias: 'alias',
		isp: 'isp',
		organizationId: null,
		isValidator: true,
		historyArchiveHasError: true,
		connectivityError: false,
		stellarCoreVersionBehind: false,
		lag: 10
	};
}
