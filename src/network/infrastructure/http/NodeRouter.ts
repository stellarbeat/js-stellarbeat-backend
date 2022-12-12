import * as express from 'express';
import { Router } from 'express';
import { Config } from '../../../core/config/Config';
import Kernel from '../../../core/infrastructure/Kernel';
import { Network, NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { TYPES } from '../../../core/infrastructure/di/di-types';
import NodeMeasurementService from '../database/repositories/NodeMeasurementService';
import NodeSnapShotter from '../database/snapshotting/NodeSnapShotter';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { err, ok, Result } from 'neverthrow';
import { isDateString } from '../../../core/utilities/isDateString';
import { getDateFromParam } from '../../../core/utilities/getDateFromParam';

export interface NodeRouterConfig {
	config: Config;
	kernel: Kernel;
}

const nodeRouterWrapper = (config: NodeRouterConfig): Router => {
	const kernel = config.kernel;
	const nodeRouter = express.Router();

	const networkReadRepository = kernel.container.get<NetworkReadRepository>(
		TYPES.NetworkReadRepository
	);
	const nodeMeasurementService = kernel.container.get(NodeMeasurementService);

	const nodeSnapShotter = kernel.container.get(NodeSnapShotter);
	const exceptionLogger =
		kernel.container.get<ExceptionLogger>('ExceptionLogger');

	const getTime = (at?: unknown): Date => {
		return at && isDateString(at) ? getDateFromParam(at) : new Date();
	};

	const getNetwork = async (at?: unknown): Promise<Result<Network, Error>> => {
		const time = getTime(at);
		const networkResult = await networkReadRepository.getNetwork(time);
		if (networkResult.isErr()) {
			exceptionLogger.captureException(networkResult.error);
			return err(networkResult.error);
		}
		if (!networkResult.value)
			return err(new Error('No network found at time: ' + time));
		return ok(networkResult.value);
	};

	nodeRouter.get(['/'], async (req: express.Request, res: express.Response) => {
		res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
		const networkResult = await getNetwork(req.query.at);
		if (networkResult.isOk()) res.send(networkResult.value.nodes);
		else res.status(500).send('Internal Server Error: no crawl data');
	});

	nodeRouter.get(
		['/:publicKey'],
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

	nodeRouter.get(
		['/:publicKey/snapshots'],
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

	nodeRouter.get(
		['/:publicKey/day-statistics'],
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

	nodeRouter.get(
		['/:publicKey/statistics'],
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

	return nodeRouter;
};

export { nodeRouterWrapper as nodeRouter };
