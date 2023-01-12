import NodeSnapShot from '../NodeSnapShot';
import { Node as NodeDTO } from '@stellarbeat/js-stellar-domain';
import NodeQuorumSet from '../NodeQuorumSet';
import NodeDetails from '../NodeDetails';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import Organization from '../../organization/Organization';
import { injectable } from 'inversify';
import Node from '../Node';
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

		nodeSnapShot.nodeDetails = NodeDetails.fromNodeDTO(nodeDTO);
		nodeSnapShot.geoData = NodeGeoDataLocation.fromGeoDataDTO(nodeDTO.geoData);
		nodeSnapShot.organization = versionedOrganization;

		return nodeSnapShot;
	}

	createUpdatedSnapShot(
		nodeSnapShot: NodeSnapShot,
		crawledNodeDTO: NodeDTO,
		startTime: Date,
		versionedOrganization: Organization | null
	) {
		const newSnapShot = new NodeSnapShot(
			nodeSnapShot.node,
			startTime,
			crawledNodeDTO.ip,
			crawledNodeDTO.port
		);

		if (!nodeSnapShot.quorumSetChanged(crawledNodeDTO))
			newSnapShot.quorumSet = nodeSnapShot.quorumSet;
		else {
			newSnapShot.quorumSet = NodeQuorumSet.fromQuorumSetDTO(
				crawledNodeDTO.quorumSetHashKey,
				crawledNodeDTO.quorumSet
			);
		}

		if (!nodeSnapShot.nodeDetailsChanged(crawledNodeDTO))
			newSnapShot.nodeDetails = nodeSnapShot.nodeDetails;
		else {
			newSnapShot.nodeDetails = NodeDetails.fromNodeDTO(crawledNodeDTO);
		}

		if (!nodeSnapShot.geoDataChanged(crawledNodeDTO))
			newSnapShot.geoData = nodeSnapShot.geoData;
		else
			newSnapShot.geoData = NodeGeoDataLocation.fromGeoDataDTO(
				crawledNodeDTO.geoData
			);

		newSnapShot.organization = versionedOrganization;

		return newSnapShot;
	}
}
