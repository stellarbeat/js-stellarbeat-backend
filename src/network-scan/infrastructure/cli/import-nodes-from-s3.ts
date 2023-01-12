import * as AWS from 'aws-sdk';
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
//import {Node} from "@stellarbeat/js-stellar-domain";
import * as path from 'path';
import Kernel from '../../../core/infrastructure/Kernel';
import { NetworkWriteRepository } from '../repositories/NetworkWriteRepository';
import NetworkUpdate from '../../domain/network/scan/NetworkUpdate';
import { Network, Node } from '@stellarbeat/js-stellar-domain';
import { Connection } from 'typeorm';
import { getConfigFromEnv } from '../../../core/config/Config';

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
	if (process.argv.length <= 2) {
		console.log('Usage: ' + __filename + ' PATH_PREFIX');

		process.exit(-1);
	}
	const pathPrefix = process.argv[2];
	await getNodeFilesFromS3(pathPrefix);
}

async function getNodeFilesFromS3(pathPrefix: string): Promise<void> {
	const accessKeyId = process.env.AWS_ACCESS_KEY;
	const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
	const bucketName = process.env.AWS_BUCKET_NAME;
	const environment = process.env.NODE_ENV;
	if (
		!accessKeyId ||
		!secretAccessKey ||
		!bucketName ||
		!accessKeyId ||
		!environment
	) {
		console.log('s3 not configured');
		return;
	}

	const s3 = new AWS.S3({
		accessKeyId: accessKeyId,
		secretAccessKey: secretAccessKey
	});

	const files = await listAllKeys(s3, bucketName, pathPrefix);

	const kernel = await Kernel.getInstance();
	const crawlResultProcessor = kernel.container.get(NetworkWriteRepository);

	for (const file of files) {
		try {
			console.log('importing file: ' + file.Key);
			const crawlDateString = path.basename(file.Key, '.json');
			const nodeStrings: AWS.S3.Types.GetObjectOutput = await s3
				.getObject({
					Bucket: bucketName,
					Key: file.Key
				})
				.promise();
			if (
				!(
					nodeStrings.Body instanceof Uint8Array &&
					nodeStrings.LastModified !== undefined
				)
			) {
				console.log('wrong output from s3 file, skipping file: ' + file.Key);
				continue;
			}
			const nodeObjects = JSON.parse(
				new Buffer(nodeStrings.Body).toString('utf8')
			);
			const nodes: Node[] = nodeObjects.map((node: any): Node => {
				return Node.fromJSON(node);
			});
			const alreadyCrawl = false; //todo
			if (alreadyCrawl !== undefined) {
				console.log(alreadyCrawl);
				console.log('already processed crawl: ' + crawlDateString);
				continue;
			}

			const crawlV2 = new NetworkUpdate(new Date(crawlDateString));
			await crawlResultProcessor.save(crawlV2, new Network(nodes, []));
		} catch (e) {
			console.log(e);
		}
	}

	await kernel.container.get(Connection).close();
}

async function listAllKeys(
	s3: AWS.S3,
	bucketName: string,
	pathPrefix: string,
	token: string | null = null,
	previousKeys: string[] = []
): Promise<any[]> {
	const opts = { Bucket: bucketName, Prefix: pathPrefix } as any;

	if (token !== null) {
		opts.ContinuationToken = token;
	}

	const data: AWS.S3.Types.ListObjectsV2Output = await s3
		.listObjectsV2(opts)
		.promise();
	const allKeys = previousKeys.concat(data.Contents as any);

	if (data.IsTruncated) {
		return await listAllKeys(
			s3,
			bucketName,
			pathPrefix,
			data.NextContinuationToken,
			allKeys
		);
	}

	return allKeys;
}
