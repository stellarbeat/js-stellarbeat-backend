import NodeSnapShot from '../../NodeSnapShot';
import { Node } from '@stellarbeat/js-stellar-domain';
import NodeQuorumSet from '../../NodeQuorumSet';
import NodeDetails from '../../NodeDetails';
import NodeGeoDataLocation from '../../NodeGeoDataLocation';
import VersionedOrganization from '../../VersionedOrganization';
import { injectable } from 'inversify';
import VersionedNode from '../../VersionedNode';
@injectable()
export default class NodeSnapShotFactory {
	create(
		versionedNode: VersionedNode,
		node: Node,
		startTime: Date,
		versionedOrganization: VersionedOrganization | null = null
	) {
		const nodeSnapShot = new NodeSnapShot(
			versionedNode,
			startTime,
			node.ip,
			node.port
		);

		nodeSnapShot.quorumSet = NodeQuorumSet.fromQuorumSet(
			node.quorumSetHashKey,
			node.quorumSet
		);

		nodeSnapShot.nodeDetails = NodeDetails.fromNode(node);
		nodeSnapShot.geoData = NodeGeoDataLocation.fromGeoData(node.geoData);
		nodeSnapShot.organization = versionedOrganization;

		return nodeSnapShot;
	}

	createUpdatedSnapShot(
		nodeSnapShot: NodeSnapShot,
		crawledNode: Node,
		startTime: Date,
		versionedOrganization: VersionedOrganization | null
	) {
		const newSnapShot = new NodeSnapShot(
			nodeSnapShot.node,
			startTime,
			crawledNode.ip,
			crawledNode.port
		);

		if (!nodeSnapShot.quorumSetChanged(crawledNode))
			newSnapShot.quorumSet = nodeSnapShot.quorumSet;
		else {
			newSnapShot.quorumSet = NodeQuorumSet.fromQuorumSet(
				crawledNode.quorumSetHashKey,
				crawledNode.quorumSet
			);
		}

		if (!nodeSnapShot.nodeDetailsChanged(crawledNode))
			newSnapShot.nodeDetails = nodeSnapShot.nodeDetails;
		else {
			newSnapShot.nodeDetails = NodeDetails.fromNode(crawledNode);
		}

		if (!nodeSnapShot.geoDataChanged(crawledNode))
			newSnapShot.geoData = nodeSnapShot.geoData;
		else
			newSnapShot.geoData = NodeGeoDataLocation.fromGeoData(
				crawledNode.geoData
			);

		newSnapShot.organization = versionedOrganization;

		return newSnapShot;
	}
}
