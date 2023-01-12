import NodeSnapShot from '../NodeSnapShot';
import { Node as NodeDTO } from '@stellarbeat/js-stellar-domain';
import NodeQuorumSet from '../NodeQuorumSet';
import NodeDetails, { NodeDetailsProps } from '../NodeDetails';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import Organization from '../../organization/Organization';
import { injectable } from 'inversify';
import Node from '../Node';
import { isNumber, isString } from '../../../../core/utilities/TypeGuards';
@injectable()
export default class NodeSnapShotFactory {
	create(
		node: Node,
		nodeDTO: NodeDTO,
		startTime: Date,
		versionedOrganization: Organization | null = null
	) {
		const nodeSnapShot = new NodeSnapShot(
			node,
			startTime,
			nodeDTO.ip,
			nodeDTO.port
		);

		nodeSnapShot.quorumSet = NodeQuorumSet.fromQuorumSetDTO(
			nodeDTO.quorumSetHashKey,
			nodeDTO.quorumSet
		);

		nodeSnapShot.nodeDetails = NodeSnapShotFactory.createNodeDetails(nodeDTO);
		if (
			nodeDTO.geoData.latitude === null &&
			nodeDTO.geoData.longitude === null
		) {
			nodeSnapShot.geoData = null;
		} else {
			nodeSnapShot.geoData = NodeGeoDataLocation.create({
				latitude: nodeDTO.geoData.latitude,
				longitude: nodeDTO.geoData.longitude,
				countryName: nodeDTO.geoData.countryName,
				countryCode: nodeDTO.geoData.countryCode
			});
		}
		nodeSnapShot.organization = versionedOrganization;

		return nodeSnapShot;
	}

	createUpdatedSnapShot(
		nodeSnapShot: NodeSnapShot,
		nodeDTO: NodeDTO,
		startTime: Date,
		versionedOrganization: Organization | null
	) {
		const newSnapShot = new NodeSnapShot(
			nodeSnapShot.node,
			startTime,
			nodeDTO.ip,
			nodeDTO.port
		);

		if (
			!nodeSnapShot.quorumSetChanged(
				nodeDTO.quorumSetHashKey,
				nodeDTO.quorumSet
			)
		)
			newSnapShot.quorumSet = nodeSnapShot.quorumSet;
		else {
			newSnapShot.quorumSet = NodeQuorumSet.fromQuorumSetDTO(
				nodeDTO.quorumSetHashKey,
				nodeDTO.quorumSet
			);
		}

		if (
			!nodeSnapShot.nodeDetailsChanged(
				NodeSnapShotFactory.createNodeDetails(nodeDTO)
			)
		)
			newSnapShot.nodeDetails = nodeSnapShot.nodeDetails;
		else {
			newSnapShot.nodeDetails = NodeSnapShotFactory.createNodeDetails(nodeDTO);
		}

		if (
			!nodeSnapShot.geoDataChanged(
				NodeSnapShotFactory.createNodeGeoDataLocation(nodeDTO)
			)
		)
			newSnapShot.geoData = nodeSnapShot.geoData;
		else
			newSnapShot.geoData = NodeGeoDataLocation.create({
				latitude: nodeDTO.geoData.latitude,
				longitude: nodeDTO.geoData.longitude,
				countryName: nodeDTO.geoData.countryName,
				countryCode: nodeDTO.geoData.countryCode
			});

		newSnapShot.organization = versionedOrganization;

		return newSnapShot;
	}

	static createNodeDetails(nodeDTO: NodeDTO): NodeDetails | null {
		if (nodeDTO.versionStr === null && nodeDTO.historyUrl === null) return null;
		const props: NodeDetailsProps = {
			ledgerVersion: isNumber(nodeDTO.ledgerVersion)
				? nodeDTO.ledgerVersion
				: null,
			overlayVersion: isNumber(nodeDTO.overlayVersion)
				? nodeDTO.overlayVersion
				: null,
			overlayMinVersion: isNumber(nodeDTO.overlayMinVersion)
				? nodeDTO.overlayMinVersion
				: null,
			versionStr: isString(nodeDTO.versionStr) ? nodeDTO.versionStr : null,
			host: isString(nodeDTO.host) ? nodeDTO.host : null,
			name: isString(nodeDTO.name) ? nodeDTO.name : null,
			homeDomain: isString(nodeDTO.homeDomain) ? nodeDTO.homeDomain : null,
			historyUrl: isString(nodeDTO.historyUrl) ? nodeDTO.historyUrl : null,
			alias: isString(nodeDTO.alias) ? nodeDTO.alias : null,
			isp: isString(nodeDTO.isp) ? nodeDTO.isp : null
		};

		return NodeDetails.create(props);
	}

	static createNodeGeoDataLocation(
		nodeDTO: NodeDTO
	): NodeGeoDataLocation | null {
		if (nodeDTO.geoData.longitude === null && nodeDTO.geoData.latitude === null)
			return null;
		return NodeGeoDataLocation.create({
			latitude: nodeDTO.geoData.latitude,
			longitude: nodeDTO.geoData.longitude,
			countryName: nodeDTO.geoData.countryName,
			countryCode: nodeDTO.geoData.countryCode
		});
	}
}
