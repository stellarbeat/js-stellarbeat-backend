import OrganizationMeasurementService from '../services/OrganizationMeasurementService';

import * as swaggerUi from 'swagger-ui-express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerDocument = require('../../openapi.json');

import { err, ok, Result } from 'neverthrow';
import * as express from 'express';
import NetworkService from '../services/NetworkService';
import Kernel from '../Kernel';
import { isDateString } from './validation/isDateString';
import NodeMeasurementService from '../services/NodeMeasurementService';
import NodeSnapShotter from '../storage/snapshotting/NodeSnapShotter';
import { Network } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotter from '../storage/snapshotting/OrganizationSnapShotter';
import { NetworkMeasurementMonthRepository } from '../storage/repositories/NetworkMeasurementMonthRepository';
import { NetworkMeasurementDayRepository } from '../storage/repositories/NetworkMeasurementDayRepository';
import { NetworkMeasurementRepository } from '../storage/repositories/NetworkMeasurementRepository';
import { Between } from 'typeorm';
import { isString } from '../utilities/TypeGuards';
import { getConfigFromEnv } from '../Config';
import { ExceptionLogger } from '../services/ExceptionLogger';

const api = express();

const getDateFromParam = (param: unknown): Date => {
	let time: Date;
	if (!(param && isDateString(param)) || !isString(param)) {
		time = new Date();
	} else {
		time = new Date(param);
	}

	return time;
};

const listen = async () => {
	const configResult = getConfigFromEnv();
	if (configResult.isErr()) {
		console.log('Invalid configuration');
		console.log(configResult.error.message);
		return;
	}

	const config = configResult.value;
	const kernel = new Kernel();
	await kernel.initializeContainer(config);

	const networkService = kernel.container.get(NetworkService);
	const nodeMeasurementService = kernel.container.get(NodeMeasurementService);
	const organizationMeasurementService = kernel.container.get(
		OrganizationMeasurementService
	);
	const nodeSnapShotter = kernel.container.get(NodeSnapShotter);
	const organizationSnapShotter = kernel.container.get(OrganizationSnapShotter);
	const exceptionLogger =
		kernel.container.get<ExceptionLogger>('ExceptionLogger');
	let latestNetworkInCache: Network | undefined;
	const getNetwork = async (at?: unknown): Promise<Result<Network, Error>> => {
		if (at && isDateString(at)) {
			const atTime = getDateFromParam(at);
			const networkResult = await networkService.getNetwork(atTime);
			if (networkResult.isErr()) {
				exceptionLogger.captureException(networkResult.error);
				return err(networkResult.error);
			}
			if (!networkResult.value)
				return err(new Error('No network found at time: ' + atTime));
			return ok(networkResult.value);
		}

		if (latestNetworkInCache) {
			return ok(latestNetworkInCache);
		}
		const networkResult = await networkService.getNetwork(new Date());
		if (networkResult.isErr()) {
			exceptionLogger.captureException(networkResult.error);
			return err(networkResult.error);
		}
		if (!networkResult.value) return err(new Error('No network found'));

		latestNetworkInCache = networkResult.value;
		return ok(latestNetworkInCache);
	};

	const swaggerOptions = {
		customCss: '.swagger-ui .topbar { display: none }',
		explorer: true,
		customSiteTitle: 'Stellarbeat API doc'
	};
	api.use(
		'/docs',
		swaggerUi.serve,
		swaggerUi.setup(swaggerDocument, swaggerOptions)
	);

	api.use(function (
		req: express.Request,
		res: express.Response,
		next: express.NextFunction
	) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header(
			'Access-Control-Allow-Headers',
			'Origin, X-Requested-With, Content-Type, Accept'
		);
		next();
	});

	api.use(function (req, res, next) {
		if (req.url.match(/^\/$/)) {
			res.redirect(301, '/v1');
		}
		next();
	});

	api.get(
		['/v1/network/stellar-public/node', '/v1/node', '/v1/nodes'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			const networkResult = await getNetwork(req.query.at);
			if (networkResult.isOk()) res.send(networkResult.value.nodes);
			else res.status(500).send('Internal Server Error: no crawl data');
		}
	);

	api.get(
		[
			'/v1/network/stellar-public/node/:publicKey',
			'/v1/node/:publicKey',
			'/v1/nodes/:publicKey'
		],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			const networkResult = await getNetwork(req.query.at);
			if (networkResult.isOk()) {
				const node = networkResult.value.getNodeByPublicKey(
					req.params.publicKey
				);
				if (node.unknown) res.send(404);
				else res.send(node);
			} else res.status(500).send('Internal Server Error: no crawl data');
		}
	);

	api.get(
		[
			'/v1/network/stellar-public/node/:publicKey/snapshots',
			'/v1/node/:publicKey/snapshots'
		],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.send(
				await nodeSnapShotter.findLatestSnapShotsByNode(
					req.params.publicKey,
					getDateFromParam(req.query.at)
				)
			);
		}
	);

	api.get(
		[
			'/v1/network/stellar-public/node/:publicKey/day-statistics',
			'/v1/node/:publicKey/day-statistics'
		],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.send(
				await nodeMeasurementService.getNodeDayMeasurements(
					req.params.publicKey,
					getDateFromParam(req.query.from),
					getDateFromParam(req.query.to)
				)
			);
		}
	);

	api.get(
		[
			'/v1/network/stellar-public/node/:publicKey/statistics',
			'/v1/node/:publicKey/statistics'
		],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.send(
				await nodeMeasurementService.getNodeMeasurements(
					req.params.publicKey,
					getDateFromParam(req.query.from),
					getDateFromParam(req.query.to)
				)
			);
		}
	);

	api.get(
		[
			'/v1/network/stellar-public/organization',
			'/v1/organization',
			'/v1/organizations'
		],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			const networkResult = await getNetwork(req.query.at);
			if (networkResult.isOk()) res.send(networkResult.value.organizations);
			else res.status(500).send('Internal Server Error: no crawl data');
		}
	);
	api.get(
		[
			'/v1/network/stellar-public/organization/:id',
			'/v1/organization/:id',
			'/v1/organizations/:id'
		],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			const networkResult = await getNetwork(req.query.at);
			if (networkResult.isOk())
				res.send(
					networkResult.value.organizations.find(
						(organization) => organization.id === req.params.id
					)
				);
			else res.status(500).send('Internal Server Error: no crawl data');
		}
	);

	api.get(
		[
			'/v1/network/stellar-public/organization/:id/snapshots',
			'/v1/organization/:id/snapshots'
		],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.send(
				await organizationSnapShotter.findLatestSnapShotsByOrganization(
					req.params.id,
					getDateFromParam(req.query.at)
				)
			);
		}
	);

	api.get(
		[
			'/v1/network/stellar-public/organization/:id/day-statistics',
			'/v1/organization/:id/day-statistics'
		],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.send(
				await organizationMeasurementService.getOrganizationDayMeasurements(
					req.params.id,
					getDateFromParam(req.query.from),
					getDateFromParam(req.query.to)
				)
			);
		}
	);

	api.get(
		[
			'/v1/network/stellar-public/organization/:id/statistics',
			'/v1/organization/:id/statistics'
		],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.send(
				await organizationMeasurementService.getOrganizationMeasurements(
					req.params.id,
					getDateFromParam(req.query.from),
					getDateFromParam(req.query.to)
				)
			);
		}
	);

	api.get(
		['/v1/network/stellar-public', '/v1', '/v2/all'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 60); // cache for 60 seconds

			const networkResult = await getNetwork(req.query.at);
			if (networkResult.isErr())
				res.status(500).send('Internal Server Error: no crawl data');
			else res.send(networkResult.value);
		}
	);

	api.get(
		['/v1/network/stellar-public/month-statistics', '/v1/month-statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

			const to = req.query.to;
			const from = req.query.from;

			if (!isDateString(to) || !isDateString(from)) {
				res.status(400);
				res.send('invalid to or from parameters');
				return;
			}

			const stats = await kernel.container
				.get(NetworkMeasurementMonthRepository)
				.findBetween(
					getDateFromParam(req.query.from),
					getDateFromParam(req.query.to)
				);
			res.send(stats);
		}
	);

	api.get(
		['/v1/network/stellar-public/day-statistics', '/v1/day-statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.send(
				await kernel.container
					.get(NetworkMeasurementDayRepository)
					.findBetween(
						getDateFromParam(req.query.from),
						getDateFromParam(req.query.to)
					)
			);
		}
	);

	api.get(
		['/v1/network/stellar-public/statistics', '/v1/statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

			const stats = await kernel.container
				.get(NetworkMeasurementRepository)
				.find({
					where: [
						{
							time: Between(
								getDateFromParam(req.query.from),
								getDateFromParam(req.query.to)
							)
						}
					],
					order: { time: 'ASC' }
				});

			res.send(stats);
		}
	);

	api.get(
		['/v1/network/stellar-public/node-snapshots', '/v1/node-snapshots'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.send(
				await nodeSnapShotter.findLatestSnapShots(
					getDateFromParam(req.query.at)
				)
			);
		}
	);

	api.get(
		[
			'/v1/network/stellar-public/organization-snapshots',
			'/v1/organization-snapshots'
		],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.send(
				await organizationSnapShotter.findLatestSnapShots(
					getDateFromParam(req.query.at)
				)
			);
		}
	);

	api.get(
		'/v1/clear-cache',
		async (req: express.Request, res: express.Response) => {
			if (req.query['token'] !== config.apiCacheClearToken) {
				res.status(401);
				res.send('invalid token');
				return;
			}

			latestNetworkInCache = undefined;
			res.send('cache cleared!');
		}
	);

	api.listen(config.apiPort, () =>
		console.log('api listening on port: ' + config.apiPort)
	);
};

listen();
