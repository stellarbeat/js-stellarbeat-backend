import OrganizationMeasurementService from '../../../network/infrastructure/database/repositories/OrganizationMeasurementService';

import * as swaggerUi from 'swagger-ui-express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerDocument = require('../../../../openapi.json');

import { err, ok, Result } from 'neverthrow';
import * as express from 'express';
import Kernel from '../Kernel';
import { isDateString } from '../../utilities/isDateString';
import NodeMeasurementService from '../../../network/infrastructure/database/repositories/NodeMeasurementService';
import NodeSnapShotter from '../../../network/infrastructure/database/snapshotting/NodeSnapShotter';
import { Network, NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotter from '../../../network/infrastructure/database/snapshotting/OrganizationSnapShotter';
import { NetworkMeasurementMonthRepository } from '../../../network/infrastructure/database/repositories/NetworkMeasurementMonthRepository';
import { NetworkMeasurementDayRepository } from '../../../network/infrastructure/database/repositories/NetworkMeasurementDayRepository';
import { NetworkMeasurementRepository } from '../../../network/infrastructure/database/repositories/NetworkMeasurementRepository';
import { Between, getConnection } from 'typeorm';
import { Config, getConfigFromEnv } from '../../config/Config';
import { ExceptionLogger } from '../../services/ExceptionLogger';
import { getDateFromParam } from '../../utilities/getDateFromParam';
import { subscriptionRouter } from '../../../notifications/infrastructure/http/SubscriptionRouter';
import * as bodyParser from 'body-parser';
import { Server } from 'net';
import helmet = require('helmet');
import { ConfirmSubscription } from '../../../notifications/use-cases/confirm-subscription/ConfirmSubscription';
import { Subscribe } from '../../../notifications/use-cases/subscribe/Subscribe';
import { UnmuteNotification } from '../../../notifications/use-cases/unmute-notification/UnmuteNotification';
import { Unsubscribe } from '../../../notifications/use-cases/unsubscribe/Unsubscribe';
import { TYPES } from '../di/di-types';
import { TYPES as HISTORY_SCAN_TYPES } from '../../../history-scan/infrastructure/di/di-types';
import { historyScanRouter } from '../../../history-scan/infrastructure/http/HistoryScanRouter';
import { ScanRepository } from '../../../history-scan/domain/scan/ScanRepository';
import { networkRouter } from '../../../network/infrastructure/http/NetworkRouter';

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
			exceptionLogger: exceptionLogger,
			historyArchiveScanRepository: kernel.container.get<ScanRepository>(
				HISTORY_SCAN_TYPES.HistoryArchiveScanRepository
			)
		})
	);

	api.use(function (req, res, next) {
		if (req.url.match(/^\/$/) || req.url.match('/v2/all')) {
			res.redirect(301, '/v1');
		}
		next();
	});
	api.use('/v1', networkRouter({ kernel, config }));

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
