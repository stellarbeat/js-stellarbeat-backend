import * as swaggerUi from 'swagger-ui-express';
import * as express from 'express';
import Kernel from '../Kernel';
import { getConnection } from 'typeorm';
import { Config, getConfigFromEnv } from '../../config/Config';
import { ExceptionLogger } from '../../services/ExceptionLogger';
import { subscriptionRouter } from '../../../notifications/infrastructure/http/SubscriptionRouter';
import * as bodyParser from 'body-parser';
import { Server } from 'net';
import { ConfirmSubscription } from '../../../notifications/use-cases/confirm-subscription/ConfirmSubscription';
import { Subscribe } from '../../../notifications/use-cases/subscribe/Subscribe';
import { UnmuteNotification } from '../../../notifications/use-cases/unmute-notification/UnmuteNotification';
import { Unsubscribe } from '../../../notifications/use-cases/unsubscribe/Unsubscribe';
import { historyScanRouter } from '../../../history-scan/infrastructure/http/HistoryScanRouter';
import { networkRouter } from '../../../network/infrastructure/http/NetworkRouter';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerDocument = require('../../../../openapi.json');

import helmet = require('helmet');
import { GetNetwork } from '../../../network/use-cases/get-network/GetNetwork';
import { GetNetworkMonthStatistics } from '../../../network/use-cases/get-network-month-statistics/GetNetworkMonthStatistics';
import { GetNetworkDayStatistics } from '../../../network/use-cases/get-network-day-statistics/GetNetworkDayStatistics';
import { GetNetworkStatistics } from '../../../network/use-cases/get-network-statistics/GetNetworkStatistics';
import { GetLatestScan } from '../../../history-scan/use-cases/get-latest-scan/GetLatestScan';
import { GetLatestNodeSnapshots } from '../../../network/use-cases/get-latest-node-snapshots/GetLatestNodeSnapshots';

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
	const exceptionLogger =
		kernel.container.get<ExceptionLogger>('ExceptionLogger');

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
			getLatestScan: kernel.container.get(GetLatestScan)
		})
	);

	api.use(function (req, res, next) {
		if (req.url.match(/^\/$/) || req.url.match('/v2/all')) {
			res.redirect(301, '/v1');
		}
		next();
	});

	api.use(
		'/v1',
		networkRouter({
			getNetwork: kernel.container.get(GetNetwork),
			getNetworkMonthStatistics: kernel.container.get(
				GetNetworkMonthStatistics
			),
			getNetworkDayStatistics: kernel.container.get(GetNetworkDayStatistics),
			getNetworkStatistics: kernel.container.get(GetNetworkStatistics),
			getLatestNodeSnapshots: kernel.container.get(GetLatestNodeSnapshots),
			kernel,
			config
		})
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
