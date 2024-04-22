import { NodeV1, NodeSnapshotV1 } from '@stellarbeat/js-stellarbeat-shared';
import { NodeMeasurementAverage } from '../domain/node/NodeMeasurementAverage';
import Node from '../domain/node/Node';
import { injectable } from 'inversify';
import 'reflect-metadata';

@injectable()
export class NodeV1DTOMapper {
	toNodeV1DTO(
		time: Date,
		node: Node,
		measurement24HourAverage?: NodeMeasurementAverage,
		measurement30DayAverage?: NodeMeasurementAverage,
		organizationId?: string //todo: refactor to OrganizationId
	): NodeV1 {
		const measurement = node.latestMeasurement();

		return {
			publicKey: node.publicKey.value,
			ip: node.ip,
			port: node.port,
			isp: node.isp,
			dateDiscovered: node.dateDiscovered.toISOString(),
			dateUpdated: node.snapshotStartDate.toISOString(),
			quorumSet: node.quorumSet?.quorumSet ?? null,
			quorumSetHashKey: node.quorumSet?.hash ?? null,
			geoData: node.geoData
				? {
						latitude: node.geoData.latitude,
						longitude: node.geoData.longitude,
						countryCode: node.geoData.countryCode,
						countryName: node.geoData.countryName
				  }
				: null,
			name: node.details?.name ?? null,
			host: node.details?.host ?? null,
			historyUrl: node.details?.historyUrl ?? null,
			alias: node.details?.alias ?? null,
			homeDomain: node.homeDomain,
			overlayVersion: node.overlayVersion,
			overlayMinVersion: node.overlayMinVersion,
			ledgerVersion: node.ledgerVersion,
			versionStr: node.versionStr,
			active: measurement?.isActive ?? false,
			isValidating: measurement?.isValidating ?? false,
			isFullValidator: measurement?.isFullValidator ?? false,
			overLoaded: measurement?.isOverLoaded ?? false,
			index: measurement?.index ? measurement.index / 100 : 0,
			activeInScp: measurement?.isActiveInScp ?? false,
			historyArchiveHasError: measurement?.historyArchiveHasError ?? false,
			isValidator: node.isValidator(),
			statistics: {
				has24HourStats: !!measurement24HourAverage,
				has30DayStats: !!measurement30DayAverage,
				active24HoursPercentage: measurement24HourAverage?.activeAvg ?? 0,
				validating24HoursPercentage:
					measurement24HourAverage?.validatingAvg ?? 0,
				overLoaded24HoursPercentage:
					measurement24HourAverage?.overLoadedAvg ?? 0,
				active30DaysPercentage: measurement30DayAverage?.activeAvg ?? 0,
				validating30DaysPercentage: measurement30DayAverage?.validatingAvg ?? 0,
				overLoaded30DaysPercentage: measurement30DayAverage?.overLoadedAvg ?? 0
			},
			organizationId: organizationId ?? null,
			connectivityError: measurement?.connectivityError ?? false,
			stellarCoreVersionBehind: measurement?.stellarCoreVersionBehind ?? false,
			lag: measurement?.lag ?? null
		};
	}

	toNodeSnapshotV1DTO(node: Node): NodeSnapshotV1 {
		return {
			node: this.toNodeV1DTO(node.snapshotStartDate, node),
			startDate: node.snapshotStartDate.toISOString(),
			endDate: node.snapshotEndDate.toISOString()
		};
	}
}
