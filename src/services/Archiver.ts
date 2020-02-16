import {NodeMeasurementDayV2Repository} from "../repositories/NodeMeasurementDayV2Repository";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import CrawlV2 from "../entities/CrawlV2";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import NodeSnapShot from "../entities/NodeSnapShot";
import OrganizationSnapShotRepository from "../repositories/OrganizationSnapShotRepository";
import {injectable} from "inversify";

@injectable()
export default class Archiver {
    protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
    protected nodeSnapShotRepository: NodeSnapShotRepository;
    protected organizationSnapShotRepository: OrganizationSnapShotRepository;

    constructor(nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository, nodeSnapShotRepository: NodeSnapShotRepository, organizationSnapShotRepository: OrganizationSnapShotRepository) {
        this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
        this.nodeSnapShotRepository = nodeSnapShotRepository;
        this.organizationSnapShotRepository = organizationSnapShotRepository;
    }

    static readonly MAX_DAYS_INACTIVE = 7;

    async archiveNodes(crawl: CrawlV2){
        let nodePublicKeyStorageIds = (await this.nodeMeasurementDayV2Repository
            .findXDaysInactive(crawl.time, Archiver.MAX_DAYS_INACTIVE))
            .map(result => result.nodePublicKeyStorageId);

        if(nodePublicKeyStorageIds.length === 0)
            return;

        let nodeSnapShots = await this.nodeSnapShotRepository.findActiveByPublicKeyStorageId(nodePublicKeyStorageIds);

        nodeSnapShots.forEach(nodeSnapShot => nodeSnapShot.endDate = crawl.time);

        await this.nodeSnapShotRepository.save(nodeSnapShots);

        //todo downgrade validators to watchers
    }

    async archiveOrganizations(crawl: CrawlV2, activeOrganizationSnapShots: OrganizationSnapShot[], activeNodeSnapShots: NodeSnapShot[]) {
        //todo: align with archiving in update node command.
        /*
        let activeNodeSnapShotMap = new Map(activeNodeSnapShots.map(snapShot => [snapShot.nodePublicKey.id, snapShot]));
        let inactiveOrganizationSnapShots:OrganizationSnapShot[] = [];
        activeOrganizationSnapShots.forEach(
            organizationSnapShot => {
                let activeValidators = organizationSnapShot.validators.filter(validator => activeNodeSnapShotMap.get(validator.id));
                if(activeValidators.length === 0){
                    organizationSnapShot.endCrawl = crawl;
                    inactiveOrganizationSnapShots.push(organizationSnapShot);
                }
            }
        );
        await this.organizationSnapShotRepository.save(inactiveOrganizationSnapShots);
         */
    }
}