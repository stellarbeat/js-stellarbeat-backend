import NodeSnapShot from '../../entities/NodeSnapShot';
import { Node } from '@stellarbeat/js-stellar-domain';
import NodeQuorumSetStorage from '../../entities/NodeQuorumSetStorage';
import NodeDetailsStorage from '../../entities/NodeDetailsStorage';
import NodeGeoDataStorage from '../../entities/NodeGeoDataStorage';
import PublicKey from '../../../../domain/PublicKey';
import OrganizationId from '../../../../domain/OrganizationId';
import { injectable } from 'inversify';
@injectable()
export default class NodeSnapShotFactory {
	create(
		nodePublicKey: PublicKey,
		node: Node,
		startTime: Date,
		organizationIdStorage: OrganizationId | null = null
	) {
		const nodeSnapShot = new NodeSnapShot(
			nodePublicKey,
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
		nodeSnapShot.organizationIdStorage = organizationIdStorage;

		return nodeSnapShot;
	}

	createUpdatedSnapShot(
		nodeSnapShot: NodeSnapShot,
		crawledNode: Node,
		startTime: Date,
		organizationIdStorage: OrganizationId | null
	) {
		const newSnapShot = new NodeSnapShot(
			nodeSnapShot.nodePublicKey,
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

		newSnapShot.organizationIdStorage = organizationIdStorage;

		return newSnapShot;
	}
}
