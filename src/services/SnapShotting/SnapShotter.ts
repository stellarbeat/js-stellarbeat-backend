import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import OrganizationSnapShotter from "./OrganizationSnapShotter";
import NodeSnapShotter from "./NodeSnapShotter";
import NodeSnapShot from "../../entities/NodeSnapShot";
import OrganizationSnapShot from "../../entities/OrganizationSnapShot";
import {injectable} from "inversify";

@injectable()
export default class SnapShotter {
    protected organizationSnapShotter: OrganizationSnapShotter;
    protected nodeSnapShotter: NodeSnapShotter;

    constructor(nodeSnapShotter: NodeSnapShotter,
                organizationSnapShotter: OrganizationSnapShotter) {
        this.nodeSnapShotter = nodeSnapShotter;
        this.organizationSnapShotter = organizationSnapShotter;
    }

    async updateOrCreateSnapShots(nodes: Node[], organizations: Organization[], time: Date):Promise<{
        nodeSnapShots: NodeSnapShot[],
        organizationSnapShots: OrganizationSnapShot[]
    }> {
        let activeSnapShots = await this.nodeSnapShotter.updateOrCreateSnapShots(nodes, time);
        let activeOrganizationSnapShots = await this.organizationSnapShotter.updateOrCreateSnapShots(organizations, time);

        return {
            nodeSnapShots: activeSnapShots,
            organizationSnapShots: activeOrganizationSnapShots
        }
    }
}