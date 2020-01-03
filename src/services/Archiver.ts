import {NodeMeasurementDayV2Repository} from "../repositories/NodeMeasurementDayV2Repository";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import {In} from "typeorm";
import CrawlV2 from "../entities/CrawlV2";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import NodeSnapShot from "../entities/NodeSnapShot";
import OrganizationSnapShotRepository from "../repositories/OrganizationSnapShotRepository";

export default class Archiver {
    protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
    protected nodeSnapShotRepository: NodeSnapShotRepository;
    protected organizationSnapShotRepository: OrganizationSnapShotRepository;
    //protected nodePublicKeyStorage:

    constructor(nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository, nodeSnapShotRepository: NodeSnapShotRepository, organizationSnapShotRepository: OrganizationSnapShotRepository) {
        this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
        this.nodeSnapShotRepository = nodeSnapShotRepository;
        this.organizationSnapShotRepository = organizationSnapShotRepository;
    }

    //todo: reduce to 15 days or less after migration.
    static readonly MAX_DAYS_INACTIVE = 31;

    async archiveNodes(crawl: CrawlV2){
        let nodePublicKeyStorageIds = (await this.nodeMeasurementDayV2Repository
            .findXDaysInactive(crawl.validFrom, Archiver.MAX_DAYS_INACTIVE))
            .map(result => result.nodePublicKeyStorageId);

        //todo: reduce to 15 days or less after migration.

        if(nodePublicKeyStorageIds.length === 0)
            return;

        let nodeSnapShots = await this.nodeSnapShotRepository.find({
            nodePublicKey: In(nodePublicKeyStorageIds)
        });

        nodeSnapShots.forEach(nodeSnapShot => nodeSnapShot.endCrawl = crawl);

        await this.nodeSnapShotRepository.save(nodeSnapShots);

        /**
        let validatorsThirtyDaysNotValidating = await this.nodeMeasurementDayV2Repository.findValidatorsThirtyDaysNotValidating();
         */
    }

    async archiveOrganizations(crawl: CrawlV2, activeOrganizationSnapShots: OrganizationSnapShot[], activeNodeSnapShots: NodeSnapShot[]) {
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
    }
}