import {
	Node as NodeDTO,
	NodeGeoData,
	NodeSnapShot as NodeSnapshotDTO
} from '@stellarbeat/js-stellarbeat-shared';
import NodeMeasurement from '../domain/node/NodeMeasurement';
import { NodeMeasurementAverage } from '../domain/node/NodeMeasurementAverage';
import NodeSnapShot from '../domain/node/NodeSnapShot';
import { NodeSnapShot as NodeSnapShotDTO } from '@stellarbeat/js-stellarbeat-shared/lib/node-snap-shot';

export class NodeSnapshotMapper {
	static toNodeDTO(
		time: Date,
		nodeSnapshot: NodeSnapShot,
		measurement?: NodeMeasurement,
		measurement24HourAverage?: NodeMeasurementAverage,
		measurement30DayAverage?: NodeMeasurementAverage,
		organizationId?: string //todo: refactor to OrganizationId
	): NodeDTO {
		const node = new NodeDTO(
			nodeSnapshot.node.publicKey.value,
			nodeSnapshot.ip ?? 'unknown',
			nodeSnapshot.port ?? 11625
		);
		node.dateDiscovered = nodeSnapshot.node.dateDiscovered;
		node.dateUpdated = time;
		if (nodeSnapshot.quorumSet) {
			node.quorumSet = nodeSnapshot.quorumSet.quorumSet;
			node.quorumSetHashKey = nodeSnapshot.quorumSet.hash;
		}

		node.geoData = new NodeGeoData();
		if (nodeSnapshot.geoData !== null) {
			node.geoData.latitude = nodeSnapshot.geoData.latitude;
			node.geoData.longitude = nodeSnapshot.geoData.longitude;
			node.geoData.countryCode = nodeSnapshot.geoData.countryCode;
			node.geoData.countryName = nodeSnapshot.geoData.countryName;
		}
		if (nodeSnapshot.nodeDetails) {
			node.host = nodeSnapshot.nodeDetails.host;
			node.name = nodeSnapshot.nodeDetails.name;
			node.historyUrl = nodeSnapshot.nodeDetails.historyUrl;
			node.alias = nodeSnapshot.nodeDetails.alias;
		}
		node.versionStr = nodeSnapshot.versionStr;
		node.overlayMinVersion = nodeSnapshot.overlayMinVersion;
		node.overlayVersion = nodeSnapshot.overlayVersion;
		node.ledgerVersion = nodeSnapshot.ledgerVersion;
		node.homeDomain = nodeSnapshot.homeDomain;
		node.isp = nodeSnapshot.isp;

		if (organizationId) {
			node.organizationId = organizationId;
		}

		if (measurement) {
			node.active = measurement.isActive;
			node.isValidating = measurement.isValidating;
			node.isFullValidator = measurement.isFullValidator;
			node.overLoaded = measurement.isOverLoaded;
			node.index = measurement.index / 100;
			node.activeInScp = measurement.isActiveInScp;
			node.historyArchiveHasError = measurement.historyArchiveHasError;
		}

		if (measurement24HourAverage) {
			node.statistics.has24HourStats = true;
			node.statistics.active24HoursPercentage =
				measurement24HourAverage.activeAvg;
			node.statistics.validating24HoursPercentage =
				measurement24HourAverage.validatingAvg;
			node.statistics.overLoaded24HoursPercentage =
				measurement24HourAverage.overLoadedAvg;
		}

		if (measurement30DayAverage) {
			node.statistics.has30DayStats = true;
			node.statistics.active30DaysPercentage =
				measurement30DayAverage.activeAvg;
			node.statistics.validating30DaysPercentage =
				measurement30DayAverage.validatingAvg;
			node.statistics.overLoaded30DaysPercentage =
				measurement30DayAverage.overLoadedAvg;
		}

		return node;
	}

	static toNodeSnapshotDTO(nodeSnapshot: NodeSnapShot): NodeSnapshotDTO {
		return new NodeSnapShotDTO(
			nodeSnapshot.startDate,
			nodeSnapshot.endDate,
			NodeSnapshotMapper.toNodeDTO(nodeSnapshot.startDate, nodeSnapshot)
		);
	}
}
