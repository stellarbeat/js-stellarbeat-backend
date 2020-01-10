import NodeSnapShotter from "./SnapShotting/NodeSnapShotter";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";
import {Node} from "@stellarbeat/js-stellar-domain";
import {NodeMeasurementV2Repository} from "../repositories/NodeMeasurementV2Repository";
import {NodeMeasurementDayV2Repository} from "../repositories/NodeMeasurementDayV2Repository";

export default class CrawlV2Service {

    protected nodeSnapShotter: NodeSnapShotter;
    protected crawlV2Repository: CrawlV2Repository;
    protected nodeMeasurementV2Repository: NodeMeasurementV2Repository;
    protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;

    constructor(nodeSnapShotter: NodeSnapShotter, crawlV2Repository: CrawlV2Repository, nodeMeasurementV2Repository: NodeMeasurementV2Repository, nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository) {
        this.nodeSnapShotter = nodeSnapShotter;
        this.crawlV2Repository = crawlV2Repository;
        this.nodeMeasurementV2Repository = nodeMeasurementV2Repository;
        this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
    }

    async getLatestNodes() {
        let latestCrawl = await this.crawlV2Repository.findLatest();
        if(!latestCrawl)
            throw new Error("No crawls found");
        let activeSnapShots = await this.nodeSnapShotter.findActiveSnapShots();
        let measurements = await this.nodeMeasurementV2Repository.find({
            where: {
                crawl: latestCrawl
            }
        });
        let measurementsMap = new Map(measurements.map(measurement => {
            return [measurement.nodePublicKeyStorage.publicKey, measurement]
        }));

        let measurement24HourAverages = await this.nodeMeasurementV2Repository.findXDaysAverageAt(latestCrawl.validFrom, 1);
        let measurement24HourAveragesMap = new Map(measurement24HourAverages.map(avg => {
            return [avg.nodeStoragePublicKeyId, avg]
        }));

        let measurement30DayAverages = await this.nodeMeasurementDayV2Repository.findXDaysAverageAt(latestCrawl.validFrom, 30);
        let measurement30DayAveragesMap = new Map(measurement30DayAverages.map(avg => {
            return [avg.nodeStoragePublicKeyId, avg]
        }));

        let nodes: Node[] = activeSnapShots
            .map(snapShot => snapShot
                .toNode(
                    latestCrawl!,
                    measurementsMap.get(snapShot.nodePublicKey.publicKey),
                    measurement24HourAveragesMap.get(snapShot.nodePublicKey.id),
                    measurement30DayAveragesMap.get(snapShot.nodePublicKey.id)
                )
            );

        return nodes;
    }
}