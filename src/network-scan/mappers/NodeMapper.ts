import {
	Node as NodeDTO,
	NodeGeoData,
	NodeSnapShot as NodeSnapshotDTO
} from '@stellarbeat/js-stellarbeat-shared';
import { NodeMeasurementAverage } from '../domain/node/NodeMeasurementAverage';
import { NodeSnapShot as NodeSnapShotDTO } from '@stellarbeat/js-stellarbeat-shared/lib/node-snap-shot';
import Node from '../domain/node/Node';
import { injectable } from 'inversify';
import 'reflect-metadata';

//@deprecated
@injectable()
export class NodeMapper {
	toNodeDTO(
		time: Date,
		node: Node,
		measurement24HourAverage?: NodeMeasurementAverage,
		measurement30DayAverage?: NodeMeasurementAverage,
		organizationId?: string //todo: refactor to OrganizationId
	): NodeDTO {
		const nodeDTO = new NodeDTO(
			node.publicKey.value,
			node.ip ?? 'unknown',
			node.port ?? 11625
		);
		nodeDTO.isp = node.isp;
		nodeDTO.dateDiscovered = node.dateDiscovered;
		nodeDTO.dateUpdated = node.snapshotStartDate;
		if (node.quorumSet) {
			nodeDTO.quorumSet = node.quorumSet.quorumSet;
			nodeDTO.quorumSetHashKey = node.quorumSet.hash;
		}

		nodeDTO.geoData = new NodeGeoData();
		if (node.geoData !== null) {
			nodeDTO.geoData.latitude = node.geoData.latitude;
			nodeDTO.geoData.longitude = node.geoData.longitude;
			nodeDTO.geoData.countryCode = node.geoData.countryCode;
			nodeDTO.geoData.countryName = node.geoData.countryName;
		}
		if (node.details) {
			nodeDTO.host = node.details.host;
			nodeDTO.name = node.details.name;
			nodeDTO.historyUrl = node.details.historyUrl;
			nodeDTO.alias = node.details.alias;
		}
		if (organizationId) {
			nodeDTO.organizationId = organizationId;
		}

		nodeDTO.homeDomain = node.homeDomain;
		nodeDTO.overlayVersion = node.overlayVersion;
		nodeDTO.overlayMinVersion = node.overlayMinVersion;
		nodeDTO.ledgerVersion = node.ledgerVersion;
		nodeDTO.versionStr = node.versionStr;

		const measurement = node.latestMeasurement();
		if (measurement) {
			nodeDTO.active = measurement.isActive;
			nodeDTO.isValidating = measurement.isValidating;
			nodeDTO.isFullValidator = measurement.isFullValidator;
			nodeDTO.overLoaded = measurement.isOverLoaded;
			nodeDTO.index = measurement.index / 100;
			nodeDTO.activeInScp = measurement.isActiveInScp;
			nodeDTO.historyArchiveHasError = measurement.historyArchiveHasError;
			nodeDTO.connectivityError = measurement.connectivityError;
		}

		if (measurement24HourAverage) {
			nodeDTO.statistics.has24HourStats = true;
			nodeDTO.statistics.active24HoursPercentage =
				measurement24HourAverage.activeAvg;
			nodeDTO.statistics.validating24HoursPercentage =
				measurement24HourAverage.validatingAvg;
			nodeDTO.statistics.overLoaded24HoursPercentage =
				measurement24HourAverage.overLoadedAvg;
		}

		if (measurement30DayAverage) {
			nodeDTO.statistics.has30DayStats = true;
			nodeDTO.statistics.active30DaysPercentage =
				measurement30DayAverage.activeAvg;
			nodeDTO.statistics.validating30DaysPercentage =
				measurement30DayAverage.validatingAvg;
			nodeDTO.statistics.overLoaded30DaysPercentage =
				measurement30DayAverage.overLoadedAvg;
		}

		return nodeDTO;
	}

	toNodeSnapshotDTO(node: Node): NodeSnapshotDTO {
		return new NodeSnapShotDTO(
			node.snapshotStartDate,
			node.snapshotEndDate,
			this.toNodeDTO(node.snapshotStartDate, node)
		);
	}
}
