import {NodeMeasurementDayV2Repository} from "../repositories/NodeMeasurementDayV2Repository";
import NodeSnapShotRepository from "../repositories/NodeSnapShotRepository";
import CrawlV2 from "../entities/CrawlV2";
import OrganizationSnapShot from "../entities/OrganizationSnapShot";
import NodeSnapShot from "../entities/NodeSnapShot";
import OrganizationSnapShotRepository from "../repositories/OrganizationSnapShotRepository";
import {injectable} from "inversify";
import {NodeMeasurementV2Repository} from "../repositories/NodeMeasurementV2Repository";
import NodeSnapShotFactory from "../factory/NodeSnapShotFactory";
import {OrganizationMeasurementDayRepository} from "../repositories/OrganizationMeasurementDayRepository";

/**
 * This service looks at the history data of snapshot and determines if it is no longer needed to track them
 */
@injectable()
export default class Archiver {
    protected nodeMeasurementRepository: NodeMeasurementV2Repository
    protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
    protected nodeSnapShotRepository: NodeSnapShotRepository;
    protected organizationSnapShotRepository: OrganizationSnapShotRepository;
    protected organizationMeasurementDayRepository: OrganizationMeasurementDayRepository;
    protected nodeSnapShotFactory: NodeSnapShotFactory;

    constructor(nodeMeasurementRepository: NodeMeasurementV2Repository, nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository, nodeSnapShotRepository: NodeSnapShotRepository, organizationSnapShotRepository: OrganizationSnapShotRepository, nodeSnapShotFactory: NodeSnapShotFactory, organizationMeasurementDayRepository: OrganizationMeasurementDayRepository) {
        this.nodeMeasurementRepository = nodeMeasurementRepository;
        this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
        this.nodeSnapShotRepository = nodeSnapShotRepository;
        this.organizationSnapShotRepository = organizationSnapShotRepository;
        this.nodeSnapShotFactory = nodeSnapShotFactory;
        this.organizationMeasurementDayRepository = organizationMeasurementDayRepository;
    }

    static readonly VALIDATORS_MAX_DAYS_INACTIVE = 7;
    static readonly WATCHERS_MAX_DAYS_INACTIVE = 1;
    static readonly ORGANIZATIONS_MAX_DAYS_INACTIVE = 7;

    async archiveNodes(crawl: CrawlV2){
        await this.archiveInactiveValidators(crawl);
        await this.archiveInactiveWatchers(crawl);
        await this.nodeSnapShotRepository.archiveInActiveWithMultipleIpSamePort(crawl.time);
        await this.demoteValidators(crawl);
        await this.archiveInactiveOrganizations(crawl);
    }

    protected async archiveInactiveWatchers(crawl: CrawlV2){
        let nodePublicKeyStorageIds = (await this.nodeMeasurementDayV2Repository
            .findXDaysInactive(crawl.time, Archiver.WATCHERS_MAX_DAYS_INACTIVE))
            .map(result => result.nodePublicKeyStorageId);

        if(nodePublicKeyStorageIds.length === 0)
            return;

        let nodeSnapShots = await this.nodeSnapShotRepository.findActiveByPublicKeyStorageId(nodePublicKeyStorageIds);
        nodeSnapShots = nodeSnapShots.filter(nodeSnapShot => nodeSnapShot.quorumSet === null);
        console.log("[Archiver] Archiving inactive watchers: " + nodeSnapShots.map(snapshot => snapshot.nodePublicKey.publicKey));
        nodeSnapShots.forEach(nodeSnapShot => nodeSnapShot.endDate = crawl.time);

        await this.nodeSnapShotRepository.save(nodeSnapShots); //Will enable after dry running some time
    }

    protected async archiveInactiveValidators(crawl:CrawlV2){
        let nodePublicKeyStorageIds = (await this.nodeMeasurementDayV2Repository
            .findXDaysInactive(crawl.time, Archiver.VALIDATORS_MAX_DAYS_INACTIVE))
            .map(result => result.nodePublicKeyStorageId);

        if(nodePublicKeyStorageIds.length === 0)
            return;

        let nodeSnapShots = await this.nodeSnapShotRepository.findActiveByPublicKeyStorageId(nodePublicKeyStorageIds);

        nodeSnapShots.forEach(nodeSnapShot => nodeSnapShot.endDate = crawl.time);

        await this.nodeSnapShotRepository.save(nodeSnapShots);
    }

    protected async demoteValidators(crawl: CrawlV2){
        let nodePublicKeyStorageIds = (await this.nodeMeasurementDayV2Repository
            .findXDaysActiveButNotValidating(crawl.time, Archiver.VALIDATORS_MAX_DAYS_INACTIVE))
            .map(result => result.nodePublicKeyStorageId);



        if(nodePublicKeyStorageIds.length === 0)
            return;

        let nodeSnapShots = await this.nodeSnapShotRepository.findActiveByPublicKeyStorageId(nodePublicKeyStorageIds);

        nodeSnapShots = nodeSnapShots.filter(nodeSnapShot => nodeSnapShot.quorumSet !== null)

        console.log("[Archiver] Found validators to demote: " + nodeSnapShots.map(nodeSnapShot => nodeSnapShot.nodePublicKey.publicKey));

        let snapshotsToSave:NodeSnapShot[] = [];
        nodeSnapShots.forEach(nodeSnapShot => {
            nodeSnapShot.endDate = crawl.time;
            snapshotsToSave.push(nodeSnapShot);
            let newNodeSnapshot = this.nodeSnapShotFactory.createUpdatedSnapShot(nodeSnapShot, nodeSnapShot.toNode(crawl.time), crawl.time, null);
            newNodeSnapshot.quorumSet = null;//demote to validator
            snapshotsToSave.push(newNodeSnapshot);
        });

        await this.nodeSnapShotRepository.save(snapshotsToSave) //Will enable after dry running some time
    }

    protected async archiveInactiveOrganizations(crawl:CrawlV2){
        let organizationIdStorageIds = (await this.organizationMeasurementDayRepository
            .findXDaysInactive(crawl.time, Archiver.ORGANIZATIONS_MAX_DAYS_INACTIVE))
            .map(result => result.organizationIdStorageId);

        if(organizationIdStorageIds.length === 0)
            return;

        let organizationSnapShots = await this.organizationSnapShotRepository.findActiveByOrganizationIdStorageId(organizationIdStorageIds);

        organizationSnapShots.forEach(organizationSnapShot => organizationSnapShot.endDate = crawl.time);

        console.log("Archiving inactive organizations: " + organizationSnapShots.map(snapshot => snapshot.organizationIdStorage.organizationId));
        await this.organizationSnapShotRepository.save(organizationSnapShots);
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