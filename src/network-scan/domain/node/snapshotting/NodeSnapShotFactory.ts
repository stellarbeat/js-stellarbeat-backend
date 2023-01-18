import NodeSnapShot from '../NodeSnapShot';
import { Node as NodeDTO } from '@stellarbeat/js-stellarbeat-shared';
import NodeQuorumSet from '../NodeQuorumSet';
import NodeDetails, { NodeDetailsProps } from '../NodeDetails';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import { injectable } from 'inversify';
import Node from '../Node';
import { isNumber, isString } from '../../../../core/utilities/TypeGuards';
import PublicKey from '../PublicKey';

//@deprecated: Node will become aggregate for Snapshot and will control the creation of snapshots
@injectable()
export default class NodeSnapShotFactory {
	create(publicKey: PublicKey, nodeDTO: NodeDTO, startTime: Date) {
		const quorumSet = NodeSnapShotFactory.createNodeQuorumSet(nodeDTO);
		const nodeDetails = NodeSnapShotFactory.createNodeDetails(nodeDTO);

		let geoData = null;
		if (
			nodeDTO.geoData.latitude !== null ||
			nodeDTO.geoData.longitude !== null
		) {
			geoData = NodeGeoDataLocation.create({
				latitude: nodeDTO.geoData.latitude,
				longitude: nodeDTO.geoData.longitude,
				countryName: nodeDTO.geoData.countryName,
				countryCode: nodeDTO.geoData.countryCode
			});
		}

		const node = Node.create(startTime, publicKey, {
			ip: nodeDTO.ip,
			port: nodeDTO.port,
			quorumSet: quorumSet,
			details: nodeDetails,
			geoData: geoData
		});

		return node.currentSnapshot();
	}

	createUpdatedSnapShot(
		nodeSnapShot: NodeSnapShot,
		nodeDTO: NodeDTO,
		startTime: Date
	) {
		const newSnapShot = new NodeSnapShot(
			startTime,
			nodeDTO.ip,
			nodeDTO.port,
			null,
			null,
			null
		);
		newSnapShot.node = nodeSnapShot.node;

		if (
			!nodeSnapShot.quorumSetChanged(
				nodeDTO.quorumSetHashKey,
				nodeDTO.quorumSet
			)
		)
			newSnapShot.quorumSet = nodeSnapShot.quorumSet;
		else {
			newSnapShot.quorumSet = NodeSnapShotFactory.createNodeQuorumSet(nodeDTO);
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

	static createNodeQuorumSet(nodeDTO: NodeDTO): NodeQuorumSet | null {
		if (
			nodeDTO.quorumSetHashKey === null ||
			(nodeDTO.quorumSet.validators.length === 0 &&
				nodeDTO.quorumSet.innerQuorumSets.length === 0)
		)
			return null;
		return NodeQuorumSet.create(nodeDTO.quorumSetHashKey, nodeDTO.quorumSet);
	}
}
