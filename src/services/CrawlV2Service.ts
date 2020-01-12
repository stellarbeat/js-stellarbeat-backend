import NodeSnapShotter from "./SnapShotting/NodeSnapShotter";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import {NodeMeasurementV2Repository} from "../repositories/NodeMeasurementV2Repository";
import {NodeMeasurementDayV2Repository} from "../repositories/NodeMeasurementDayV2Repository";
import CrawlV2 from "../entities/CrawlV2";
import OrganizationSnapShotter from "./SnapShotting/OrganizationSnapShotter";
import {OrganizationMeasurementDayRepository} from "../repositories/OrganizationMeasurementDayRepository";
import {OrganizationMeasurementRepository} from "../repositories/OrganizationMeasurementRepository";

export default class CrawlV2Service {

    protected nodeSnapShotter: NodeSnapShotter;
    protected organizationSnapShotter: OrganizationSnapShotter;
    protected crawlV2Repository: CrawlV2Repository;
    protected nodeMeasurementV2Repository: NodeMeasurementV2Repository;
    protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
    protected organizationMeasurementRepository: OrganizationMeasurementRepository;
    protected organizationMeasurementDayRepository: OrganizationMeasurementDayRepository;

    constructor(nodeSnapShotter: NodeSnapShotter, organizationSnapShotter: OrganizationSnapShotter, crawlV2Repository: CrawlV2Repository, nodeMeasurementV2Repository: NodeMeasurementV2Repository, nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository, organizationMeasurementRepository: OrganizationMeasurementRepository, organizationMeasurementDayRepository: OrganizationMeasurementDayRepository) {
        this.nodeSnapShotter = nodeSnapShotter;
        this.organizationSnapShotter = organizationSnapShotter;
        this.crawlV2Repository = crawlV2Repository;
        this.nodeMeasurementV2Repository = nodeMeasurementV2Repository;
        this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
        this.organizationMeasurementRepository = organizationMeasurementRepository;
        this.organizationMeasurementDayRepository = organizationMeasurementDayRepository;
    }

    async getLatest(): Promise<{ nodes: Node[], organizations: Organization[] }> {
        let latestCrawl = await this.crawlV2Repository.findLatest();
        if (!latestCrawl)
            throw new Error("No crawls found");

        let nodes = await this.getNodes(latestCrawl);
        let organizations = await this.getOrganizations(latestCrawl);

        return {
            nodes: nodes,
            organizations: organizations
        }
    }

    async getNodes(crawl: CrawlV2) {
        let activeSnapShots = await this.nodeSnapShotter.findSnapShotsActiveInCrawl(crawl);
        let measurements = await this.nodeMeasurementV2Repository.find({
            where: {
                time: crawl.validFrom
            }
        });
        let measurementsMap = new Map(measurements.map(measurement => {
            return [measurement.nodePublicKeyStorage.publicKey, measurement]
        }));

        let measurement24HourAverages = await this.nodeMeasurementV2Repository.findXDaysAverageAt(crawl.validFrom, 1); //24 hours can be calculated 'live' quickly
        let measurement24HourAveragesMap = new Map(measurement24HourAverages.map(avg => {
            return [avg.nodeStoragePublicKeyId, avg]
        }));

        let measurement30DayAverages = await this.nodeMeasurementDayV2Repository.findXDaysAverageAt(crawl.validFrom, 30);
        let measurement30DayAveragesMap = new Map(measurement30DayAverages.map(avg => {
            return [avg.nodeStoragePublicKeyId, avg]
        }));

        let nodes: Node[] = activeSnapShots
            .map(snapShot => snapShot
                .toNode(
                    crawl,
                    measurementsMap.get(snapShot.nodePublicKey.publicKey),
                    measurement24HourAveragesMap.get(snapShot.nodePublicKey.id),
                    measurement30DayAveragesMap.get(snapShot.nodePublicKey.id)
                )
            );

        return nodes;
    }

    async getOrganizations(crawl: CrawlV2) {
        let activeSnapShots = await this.organizationSnapShotter.findSnapShotsActiveInCrawl(crawl);
        let measurements = await this.organizationMeasurementRepository.find({
            where: {
                time: crawl.validFrom
            }
        });
        let measurementsMap = new Map(measurements.map(measurement => {
            return [measurement.organizationIdStorage.organizationId, measurement]
        }));

        let measurement24HourAverages = await this.organizationMeasurementRepository.findXDaysAverageAt(crawl.validFrom, 1); //24 hours can be calculated 'live' quickly
        let measurement24HourAveragesMap = new Map(measurement24HourAverages.map(avg => {
            return [avg.organizationIdStorageId, avg]
        }));

        let measurement30DayAverages = await this.organizationMeasurementDayRepository.findXDaysAverageAt(crawl.validFrom, 30);
        let measurement30DayAveragesMap = new Map(measurement30DayAverages.map(avg => {
            return [avg.organizationIdStorageId, avg]
        }));

        let organizations: Organization[] = activeSnapShots
            .map(snapShot => snapShot
                .toOrganization(
                    crawl,
                    measurementsMap.get(snapShot.organizationIdStorage.organizationId),
                    measurement24HourAveragesMap.get(snapShot.organizationIdStorage.id),
                    measurement30DayAveragesMap.get(snapShot.organizationIdStorage.id)
                )
            );

        return organizations;
    }
}