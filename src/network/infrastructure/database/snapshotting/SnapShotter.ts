import { Node, Organization } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotter from './OrganizationSnapShotter';
import NodeSnapShotter from './NodeSnapShotter';
import NodeSnapShot from '../entities/NodeSnapShot';
import OrganizationSnapShot from '../entities/OrganizationSnapShot';
import { injectable } from 'inversify';

@injectable()
export default class SnapShotter {
	protected organizationSnapShotter: OrganizationSnapShotter;
	protected nodeSnapShotter: NodeSnapShotter;

	constructor(
		nodeSnapShotter: NodeSnapShotter,
		organizationSnapShotter: OrganizationSnapShotter
	) {
		this.nodeSnapShotter = nodeSnapShotter;
		this.organizationSnapShotter = organizationSnapShotter;
	}

	async updateOrCreateSnapShots(
		nodes: Node[],
		organizations: Organization[],
		time: Date
	): Promise<{
		nodeSnapShots: NodeSnapShot[];
		organizationSnapShots: OrganizationSnapShot[];
	}> {
		//todo: analysis: as a first step we should create/find all the necessary NodePublicKey and OrganizationID storage instances. This will avoid the weird cases where an organization is first created because it is detected through an organizationID in a node. Or when an organization is created because it is found in the domain organizations array.
		//this will also allow us to return all the snapshots from snapshotter, and save everything in 1 network update transaction (if we want).
		const nodeSnapShots = await this.nodeSnapShotter.updateOrCreateSnapShots(
			nodes,
			time
		);
		//organization snapshotter checks if its validator snapshots are still active and is archived otherwise, so order of running these snapshotters is fixed. Todo: setter is not ideal, could be improved. Todo2: nodes are archived as a last step in the crawl result processor. This means a dependent organization is only archived in the next crawl, this also could be improved by merging the archiver into the node snapshotter. But need to think about a good design.
		this.organizationSnapShotter.setNodeSnapShots(nodeSnapShots);
		const organizationSnapShots =
			await this.organizationSnapShotter.updateOrCreateSnapShots(
				organizations,
				time
			);

		return {
			nodeSnapShots: nodeSnapShots,
			organizationSnapShots: organizationSnapShots
		};
	}
}
