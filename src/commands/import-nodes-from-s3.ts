import * as AWS from "aws-sdk";
import {createConnection, getCustomRepository} from "typeorm";
import Crawl from "../entities/Crawl";
//import NodeStorage from "../entities/NodeStorage";
import {CrawlRepository} from "../repositories/CrawlRepository";
require('dotenv').config();
//import {Node} from "@stellarbeat/js-stellar-domain";
import * as path from "path";
import NodeMeasurement from "../entities/NodeMeasurement";

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {

    if (process.argv.length <= 2) {
        console.log("Usage: " + __filename + " PATH_PREFIX");

        process.exit(-1);
    }
    let pathPrefix = process.argv[2];
    await getNodeFilesFromS3(pathPrefix);
}

async function getNodeFilesFromS3(pathPrefix: string): Promise<void> {
    let accessKeyId = process.env.AWS_ACCESS_KEY;
    let secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    let bucketName = process.env.AWS_BUCKET_NAME;
    let environment = process.env.NODE_ENV;
    if (!accessKeyId || !secretAccessKey || !bucketName || !accessKeyId || !environment) {
        console.log("s3 not configured");
        return;
    }

    let s3 = new AWS.S3({
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
    });

    let files = await listAllKeys(s3, bucketName, pathPrefix);

    let connection = await createConnection();
    let crawlRepository = getCustomRepository(CrawlRepository);

    for(let file of files) {
        try {
            console.log("importing file: " + file.Key);
            let crawlDateString = path.basename(file.Key, '.json');
            let nodes:AWS.S3.Types.GetObjectOutput = await s3.getObject({
                Bucket: bucketName,
                Key: file.Key
            }).promise();
            if(!(nodes.Body instanceof Uint8Array && nodes.LastModified !== undefined)) {
                console.log("wrong output from s3 file, skipping file: " + file.Key);
                continue;
            }
            let nodeObjects = JSON.parse(new Buffer(nodes.Body).toString("utf8"));
            let alreadyCrawl = await crawlRepository.findByTime(new Date(crawlDateString));
            if(alreadyCrawl !== undefined) {
                console.log(alreadyCrawl);
                console.log('already processed crawl: ' + crawlDateString);
                continue;
            }
            let crawl = new Crawl(new Date(crawlDateString));
            console.log("saving to db");
            await connection.manager.save(crawl);

            let nodeMeasurements = nodeObjects.map( (nodeObject:any) => {
                //let nodeStorage = new NodeStorage(crawl, Node.fromJSON(nodeObject));
                //await connection.manager.save(nodeStorage);
                let nodeMeasurement = new NodeMeasurement(nodeObject.publicKey, crawl.time);
                nodeMeasurement.isActive = nodeObject.active;
                nodeMeasurement.isOverLoaded = nodeObject.overLoaded;
                if(nodeObject.isValidating)
                    nodeMeasurement.isValidating = nodeObject.isValidating;
                return nodeMeasurement;
            });

            await connection.manager.save(nodeMeasurements);

        } catch (e) {
            console.log(e);
        }
    }

    await connection.close();
}

async function listAllKeys(s3: AWS.S3, bucketName: string, pathPrefix: string, token: string | null = null, previousKeys: string[] = []): Promise<any[]> {
    var opts = {Bucket: bucketName, Prefix: pathPrefix} as any;

    if (token !== null) {
        opts.ContinuationToken = token;
    }

    let data:AWS.S3.Types.ListObjectsV2Output = await s3.listObjectsV2(opts).promise();
    let allKeys = previousKeys.concat(data.Contents as any);

    if (data.IsTruncated) {
        return await listAllKeys(s3, bucketName, pathPrefix, data.NextContinuationToken, allKeys);
    }


    return allKeys;
}