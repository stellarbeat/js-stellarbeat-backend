import {
	Node as NodeDTO,
	NodeGeoData,
	NodeSnapShot as NodeSnapshotDTO
} from '@stellarbeat/js-stellar-domain';
import NodeMeasurement from '../domain/node/NodeMeasurement';
import { NodeMeasurementAverage } from '../domain/node/NodeMeasurementAverage';
import NodeSnapShot from '../domain/node/NodeSnapShot';
import { NodeSnapShot as NodeSnapShotDTO } from '@stellarbeat/js-stellar-domain/lib/node-snap-shot';

export class NodeMapper {
	static toNodeDTO(
		time: Date,
		nodeSnapshot: NodeSnapShot,
		measurement?: NodeMeasurement,
		measurement24HourAverage?: NodeMeasurementAverage,
		measurement30DayAverage?: NodeMeasurementAverage
	): NodeDTO {
		const node = new NodeDTO(
			nodeSnapshot.node.publicKey.value,
			nodeSnapshot.ip,
			nodeSnapshot.port
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
			nodeSnapshot.nodeDetails.updateNodeDTOWithDetails(node);
		}
		if (nodeSnapshot.organization) {
			node.organizationId = nodeSnapshot.organization.organizationId.value;
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
			NodeMapper.toNodeDTO(nodeSnapshot.startDate, nodeSnapshot)
		);
	}
}
