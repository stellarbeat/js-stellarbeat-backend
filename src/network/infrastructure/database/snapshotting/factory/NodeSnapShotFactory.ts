import NodeSnapShot from '../../entities/NodeSnapShot';
import { Node } from '@stellarbeat/js-stellar-domain';
import NodeQuorumSetStorage from '../../entities/NodeQuorumSetStorage';
import NodeDetailsStorage from '../../entities/NodeDetailsStorage';
import NodeGeoDataStorage from '../../entities/NodeGeoDataStorage';
import VersionedOrganization from '../../../../domain/VersionedOrganization';
import { injectable } from 'inversify';
import VersionedNode from '../../entities/VersionedNode';
@injectable()
export default class NodeSnapShotFactory {
	create(
		versionedNode: VersionedNode,
		node: Node,
		startTime: Date,
		organizationIdStorage: VersionedOrganization | null = null
	) {
		const nodeSnapShot = new NodeSnapShot(
			versionedNode,
			startTime,
			startTime,
			node.ip,
			node.port
		);

		nodeSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(
			node.quorumSetHashKey,
			node.quorumSet
		);

		nodeSnapShot.nodeDetails = NodeDetailsStorage.fromNode(node);
		nodeSnapShot.geoData = NodeGeoDataStorage.fromGeoData(node.geoData);
		nodeSnapShot.organization = organizationIdStorage;

		return nodeSnapShot;
	}

	createUpdatedSnapShot(
		nodeSnapShot: NodeSnapShot,
		crawledNode: Node,
		startTime: Date,
		organizationIdStorage: VersionedOrganization | null
	) {
		const newSnapShot = new NodeSnapShot(
			nodeSnapShot.node,
			nodeSnapShot.discoveryDate,
			startTime,
			crawledNode.ip,
			crawledNode.port
		);

		if (!nodeSnapShot.quorumSetChanged(crawledNode))
			newSnapShot.quorumSet = nodeSnapShot.quorumSet;
		else {
			newSnapShot.quorumSet = NodeQuorumSetStorage.fromQuorumSet(
				crawledNode.quorumSetHashKey,
				crawledNode.quorumSet
			);
		}

		if (!nodeSnapShot.nodeDetailsChanged(crawledNode))
			newSnapShot.nodeDetails = nodeSnapShot.nodeDetails;
		else {
			newSnapShot.nodeDetails = NodeDetailsStorage.fromNode(crawledNode);
		}

		if (!nodeSnapShot.geoDataChanged(crawledNode))
			newSnapShot.geoData = nodeSnapShot.geoData;
		else
			newSnapShot.geoData = NodeGeoDataStorage.fromGeoData(crawledNode.geoData);

		newSnapShot.organization = organizationIdStorage;

		return newSnapShot;
	}
}
