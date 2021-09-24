import NodeSnapShotter from "./SnapShotting/NodeSnapShotter";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import {Node, Organization} from "@stellarbeat/js-stellar-domain";
import {NodeMeasurementV2Repository} from "../repositories/NodeMeasurementV2Repository";
import {NodeMeasurementDayV2Repository} from "../repositories/NodeMeasurementDayV2Repository";
import OrganizationSnapShotter from "./SnapShotting/OrganizationSnapShotter";
import {OrganizationMeasurementDayRepository} from "../repositories/OrganizationMeasurementDayRepository";
import {OrganizationMeasurementRepository} from "../repositories/OrganizationMeasurementRepository";
import {inject, injectable} from "inversify";
import {LessThanOrEqual} from "typeorm";
import {NodePublicKeyStorageRepository} from "../entities/NodePublicKeyStorage";
import {OrganizationIdStorageRepository} from "../entities/OrganizationIdStorage";
import {NetworkMeasurementRepository} from "../repositories/NetworkMeasurementRepository";
import NetworkStatistics from "@stellarbeat/js-stellar-domain/lib/network-statistics";

@injectable()
export default class CrawlV2Service {

    protected nodeSnapShotter: NodeSnapShotter;
    protected organizationSnapShotter: OrganizationSnapShotter;
    protected crawlV2Repository: CrawlV2Repository;
    protected nodeMeasurementV2Repository: NodeMeasurementV2Repository;
    protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;
    protected organizationMeasurementRepository: OrganizationMeasurementRepository;
    protected organizationMeasurementDayRepository: OrganizationMeasurementDayRepository;
    protected nodePublicKeyStorageRepository: NodePublicKeyStorageRepository;
    protected organizationIdStorageRepository: OrganizationIdStorageRepository;
    protected networkMeasurementRepository: NetworkMeasurementRepository;


    constructor(nodeSnapShotter: NodeSnapShotter, organizationSnapShotter: OrganizationSnapShotter, crawlV2Repository: CrawlV2Repository, nodeMeasurementV2Repository: NodeMeasurementV2Repository, nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository, organizationMeasurementRepository: OrganizationMeasurementRepository, organizationMeasurementDayRepository: OrganizationMeasurementDayRepository, @inject('NodePublicKeyStorageRepository') nodePublicKeyStorageRepository: NodePublicKeyStorageRepository, @inject('OrganizationIdStorageRepository') organizationIdStorageRepository: OrganizationIdStorageRepository, networkMeasurementRepository: NetworkMeasurementRepository) {
        this.nodeSnapShotter = nodeSnapShotter;
        this.organizationSnapShotter = organizationSnapShotter;
        this.crawlV2Repository = crawlV2Repository;
        this.nodeMeasurementV2Repository = nodeMeasurementV2Repository;
        this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
        this.organizationMeasurementRepository = organizationMeasurementRepository;
        this.organizationMeasurementDayRepository = organizationMeasurementDayRepository;
        this.nodePublicKeyStorageRepository = nodePublicKeyStorageRepository;
        this.organizationIdStorageRepository = organizationIdStorageRepository;
        this.networkMeasurementRepository = networkMeasurementRepository;
    }

    async getCrawlAt(time: Date): Promise<{
        //todo return Network instance?
        //todo undefined fbasAnalysisResult should throw Error
        nodes: Node[],
        organizations: Organization[],
        statistics: NetworkStatistics|undefined,
        time: Date,
        latestLedger: bigint
    } | undefined
        > {
        // @ts-ignore
        let crawl = await this.crawlV2Repository.findOne(
            {
                where: {time: LessThanOrEqual(time), completed: true},
                order: {time: "DESC"},
                take: 1
            }
        );

        if (!crawl)
            return undefined;

        let nodes = await this.getNodes(crawl.time);
        let organizations = await this.getOrganizations(crawl.time);
        let networkStatistics = await this.getNetworkStatistics(crawl.time);

        return {
            nodes: nodes,
            organizations: organizations,
            statistics: networkStatistics,
            time: crawl.time,
            latestLedger: crawl.latestLedger
        }
    }

    async getNetworkStatistics(time:Date) {
        let measurement = await this.networkMeasurementRepository.findOne({
            where: {
                time: time
            }
        });
        if(!measurement)
            return undefined;

        let networkStatistics = new NetworkStatistics();

        for (const key of Object.keys(measurement)) {//Object.keys only returns properties that have a value in typescript
            if(key === 'time')
                continue;
             // @ts-ignore
            networkStatistics[key] = measurement[key];
        }

        return networkStatistics;
    }

    async getNodes(time: Date) {
        let activeSnapShots = await this.nodeSnapShotter.findSnapShotsActiveAtTime(time);
        let measurements = await this.nodeMeasurementV2Repository.find({
            where: {
                time: time
            }
        });

        let measurementsMap = new Map(measurements.map(measurement => {
            return [measurement.nodePublicKeyStorage.publicKey, measurement]
        }));

        let measurement24HourAverages = await this.nodeMeasurementV2Repository.findXDaysAverageAt(time, 1); //24 hours can be calculated 'live' quickly
        let measurement24HourAveragesMap = new Map(measurement24HourAverages.map(avg => {
            return [avg.nodeStoragePublicKeyId, avg]
        }));

        let measurement30DayAverages = await this.nodeMeasurementDayV2Repository.findXDaysAverageAt(time, 30);
        let measurement30DayAveragesMap = new Map(measurement30DayAverages.map(avg => {
            return [avg.nodeStoragePublicKeyId, avg]
        }));

        let nodes: Node[] = activeSnapShots
            .map(snapShot => snapShot
                .toNode(
                    time,
                    measurementsMap.get(snapShot.nodePublicKey.publicKey),
                    measurement24HourAveragesMap.get(snapShot.nodePublicKey.id),
                    measurement30DayAveragesMap.get(snapShot.nodePublicKey.id)
                )
            );

        return nodes;
    }

    async getOrganizations(time: Date) {
        let activeSnapShots = await this.organizationSnapShotter.findSnapShotsActiveAtTime(time);
        let measurements = await this.organizationMeasurementRepository.find({
            where: {
                time: time
            }
        });
        let measurementsMap = new Map(measurements.map(measurement => {
            return [measurement.organizationIdStorage.organizationId, measurement]
        }));

        let measurement24HourAverages = await this.organizationMeasurementRepository.findXDaysAverageAt(time, 1); //24 hours can be calculated 'live' quickly
        let measurement24HourAveragesMap = new Map(measurement24HourAverages.map(avg => {
            return [avg.organizationIdStorageId, avg]
        }));

        let measurement30DayAverages = await this.organizationMeasurementDayRepository.findXDaysAverageAt(time, 30);
        let measurement30DayAveragesMap = new Map(measurement30DayAverages.map(avg => {
            return [avg.organizationIdStorageId, avg]
        }));

        let organizations: Organization[] = activeSnapShots
            .map(snapShot => snapShot
                .toOrganization(
                    time,
                    measurementsMap.get(snapShot.organizationIdStorage.organizationId),
                    measurement24HourAveragesMap.get(snapShot.organizationIdStorage.id),
                    measurement30DayAveragesMap.get(snapShot.organizationIdStorage.id)
                )
            );

        return organizations;
    }

    async getNodeDayStatistics(publicKey: string, from: Date, to: Date) {
        let nodePublicKey = await this.nodePublicKeyStorageRepository.findOne({
            where: {
                publicKey: publicKey
            }
        });

        if (!nodePublicKey) {
            return [];
        }

        return await this.nodeMeasurementDayV2Repository.findBetween(nodePublicKey, from, to);
    }

    async getOrganizationDayStatistics(organizationId: string, from: Date, to: Date) {
        let organizationIdStorage = await this.organizationIdStorageRepository.findOne({
            where: {
                organizationId: organizationId
            }
        });

        if (!organizationIdStorage) {
            return [];
        }

        return await this.organizationMeasurementDayRepository.findBetween(organizationIdStorage, from, to);
    }
}