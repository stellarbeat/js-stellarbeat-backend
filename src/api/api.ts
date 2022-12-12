import OrganizationMeasurementService from '../network/infrastructure/database/repositories/OrganizationMeasurementService';

import * as swaggerUi from 'swagger-ui-express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerDocument = require('../../openapi.json');

import { err, ok, Result } from 'neverthrow';
import * as express from 'express';
import Kernel from '../shared/core/Kernel';
import { isDateString } from '../shared/utilities/isDateString';
import NodeMeasurementService from '../network/infrastructure/database/repositories/NodeMeasurementService';
import NodeSnapShotter from '../network/infrastructure/database/snapshotting/NodeSnapShotter';
import { Network, NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotter from '../network/infrastructure/database/snapshotting/OrganizationSnapShotter';
import { NetworkMeasurementMonthRepository } from '../network/infrastructure/database/repositories/NetworkMeasurementMonthRepository';
import { NetworkMeasurementDayRepository } from '../network/infrastructure/database/repositories/NetworkMeasurementDayRepository';
import { NetworkMeasurementRepository } from '../network/infrastructure/database/repositories/NetworkMeasurementRepository';
import { Between, getConnection } from 'typeorm';
import { Config, getConfigFromEnv } from '../shared/config/Config';
import { ExceptionLogger } from '../shared/services/ExceptionLogger';
import { getDateFromParam } from '../shared/utilities/getDateFromParam';
import { subscriptionRouter } from '../notifications/infrastructure/http/SubscriptionRouter';
import * as bodyParser from 'body-parser';
import { Server } from 'net';
import helmet = require('helmet');
import { ConfirmSubscription } from '../notifications/use-cases/confirm-subscription/ConfirmSubscription';
import { Subscribe } from '../notifications/use-cases/subscribe/Subscribe';
import { UnmuteNotification } from '../notifications/use-cases/unmute-notification/UnmuteNotification';
import { Unsubscribe } from '../notifications/use-cases/unsubscribe/Unsubscribe';
import { TYPES } from '../shared/core/di-types';
import { TYPES as HISTORY_SCAN_TYPES } from '../history-scan/infrastructure/di/di-types';
import { historyScanRouter } from '../history-scan/infrastructure/http/HistoryScanRouter';
import { ScanRepository } from '../history-scan/domain/scan/ScanRepository';

let server: Server;
const api = express();
api.use(bodyParser.json());
api.use(helmet());
api.set('trust proxy', true); //todo: env var

const setup = async (): Promise<{ config: Config; kernel: Kernel }> => {
	const configResult = getConfigFromEnv();
	if (configResult.isErr()) {
		console.log('Invalid configuration');
		console.log(configResult.error.message);
		throw new Error('Invalid configuration');
	}

	const config = configResult.value;
	const kernel = await Kernel.getInstance(config);

	return {
		config: config,
		kernel: kernel
	};
};
const listen = async () => {
	const { config, kernel } = await setup();

	const networkReadRepository = kernel.container.get<NetworkReadRepository>(
		TYPES.NetworkReadRepository
	);
	const nodeMeasurementService = kernel.container.get(NodeMeasurementService);
	const organizationMeasurementService = kernel.container.get(
		OrganizationMeasurementService
	);
	const nodeSnapShotter = kernel.container.get(NodeSnapShotter);
	const organizationSnapShotter = kernel.container.get(OrganizationSnapShotter);
	const exceptionLogger =
		kernel.container.get<ExceptionLogger>('ExceptionLogger');

	const getNetwork = async (at?: unknown): Promise<Result<Network, Error>> => {
		let time = new Date();
		if (at && isDateString(at)) {
			time = getDateFromParam(at);
		}

		const networkResult = await networkReadRepository.getNetwork(time);
		if (networkResult.isErr()) {
			exceptionLogger.captureException(networkResult.error);
			return err(networkResult.error);
		}
		if (!networkResult.value)
			return err(new Error('No network found at time: ' + time));
		return ok(networkResult.value);
	};

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
		res.header(
			'Access-Control-Allow-Methods',
			'GET, POST, PUT, DELETE, OPTIONS'
		);
		next();
	});

	const swaggerOptions = {
		customCss: '.swagger-ui .topbar { display: none }',
		explorer: true,
		customSiteTitle: 'Stellarbeat API doc'
	};

	api.get(
		'/docs',
		async (req: express.Request, res: express.Response, next) => {
			res.set('Content-Security-Policy', "frame-src 'self'");
			next();
		}
	);
	api.use(
		'/docs',
		swaggerUi.serve,
		swaggerUi.setup(swaggerDocument, swaggerOptions)
	);

	api.use(
		'/v1/subscription',
		subscriptionRouter({
			exceptionLogger: exceptionLogger,
			confirmSubscription: kernel.container.get(ConfirmSubscription),
			subscribe: kernel.container.get(Subscribe),
			unmuteNotification: kernel.container.get(UnmuteNotification),
			unsubscribe: kernel.container.get(Unsubscribe)
		})
	);

	api.use(
		'/v1/history-scan',
		historyScanRouter({
			exceptionLogger: exceptionLogger,
			historyArchiveScanRepository: kernel.container.get<ScanRepository>(
				HISTORY_SCAN_TYPES.HistoryArchiveScanRepository
			)
		})
	);

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

	server = api.listen(config.apiPort, () =>
		console.log('api listening on port: ' + config.apiPort)
	);
};

listen();

process.on('SIGTERM', async () => {
	console.log('SIGTERM signal received: closing HTTP server');
	await stop();
});

process.on('SIGINT', async () => {
	console.log('SIGTERM signal received: closing HTTP server');
	await stop();
});

async function stop() {
	server.close(async () => {
		console.log('HTTP server closed');
		await getConnection().close();
		console.log('connection to db closed');
	});
}
