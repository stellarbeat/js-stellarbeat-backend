import * as express from 'express';
import { Router } from 'express';
import { Config } from '../../../core/config/Config';
import Kernel from '../../../core/infrastructure/Kernel';
import { Network, NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { TYPES } from '../../../core/infrastructure/di/di-types';
import NodeMeasurementService from '../database/repositories/NodeMeasurementService';
import OrganizationMeasurementService from '../database/repositories/OrganizationMeasurementService';
import NodeSnapShotter from '../database/snapshotting/NodeSnapShotter';
import OrganizationSnapShotter from '../database/snapshotting/OrganizationSnapShotter';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { err, ok, Result } from 'neverthrow';
import { isDateString } from '../../../core/utilities/isDateString';
import { getDateFromParam } from '../../../core/utilities/getDateFromParam';
import { GetNetwork } from '../../use-cases/get-network/GetNetwork';
import { GetNetworkMonthStatistics } from '../../use-cases/get-network-month-statistics/GetNetworkMonthStatistics';
import { GetNetworkDayStatistics } from '../../use-cases/get-network-day-statistics/GetNetworkDayStatistics';
import { GetNetworkStatistics } from '../../use-cases/get-network-statistics/GetNetworkStatistics';

export interface NetworkRouterConfig {
	getNetwork: GetNetwork;
	getNetworkMonthStatistics: GetNetworkMonthStatistics;
	getNetworkDayStatistics: GetNetworkDayStatistics;
	getNetworkStatistics: GetNetworkStatistics;
	config: Config;
	kernel: Kernel;
}

const networkRouterWrapper = (config: NetworkRouterConfig): Router => {
	const kernel = config.kernel;
	const networkRouter = express.Router();

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

	networkRouter.get(
		['/node', '/nodes'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			const networkResult = await getNetwork(req.query.at);
			if (networkResult.isOk()) res.send(networkResult.value.nodes);
			else res.status(500).send('Internal Server Error: no crawl data');
		}
	);

	networkRouter.get(
		['/node/:publicKey', '/nodes/:publicKey'],
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

	networkRouter.get(
		['/node/:publicKey/snapshots'],
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

	networkRouter.get(
		['/node/:publicKey/day-statistics'],
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

	networkRouter.get(
		['/node/:publicKey/statistics'],
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

	networkRouter.get(
		['/organization', '/organizations'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			const networkResult = await getNetwork(req.query.at);
			if (networkResult.isOk()) res.send(networkResult.value.organizations);
			else res.status(500).send('Internal Server Error: no crawl data');
		}
	);
	networkRouter.get(
		['/organization/:id', '/organizations/:id'],
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

	networkRouter.get(
		['/organization/:id/snapshots'],
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

	networkRouter.get(
		['/organization/:id/day-statistics'],
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

	networkRouter.get(
		['/organization/:id/statistics'],
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

	networkRouter.get(
		['/'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 60); // cache for 60 seconds

			const getNetwork = kernel.container.get(GetNetwork);
			const networkOrError = await getNetwork.execute({
				at: getTime(req.query.at)
			});

			if (networkOrError.isErr())
				res.status(500).send('Internal Server Error: no crawl data');
			else if (networkOrError.value === null)
				res.status(404).send('No network found');
			else res.send(networkOrError.value);
		}
	);

	networkRouter.get(
		['/month-statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

			const to = req.query.to;
			const from = req.query.from;

			if (!isDateString(to) || !isDateString(from)) {
				res.status(400);
				res.send('invalid or missing to or from parameters');
				return;
			}

			const statsOrError = await config.getNetworkMonthStatistics.execute({
				from: getDateFromParam(req.query.from),
				to: getDateFromParam(req.query.to)
			});
			if (statsOrError.isErr()) {
				res.status(500).send('Internal Server Error');
			} else res.send(statsOrError.value);
		}
	);

	networkRouter.get(
		['/day-statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

			const to = req.query.to;
			const from = req.query.from;

			if (!isDateString(to) || !isDateString(from)) {
				res.status(400);
				res.send('invalid or missing to or from parameters');
				return;
			}

			const statsOrError = await config.getNetworkDayStatistics.execute({
				from: getDateFromParam(req.query.from),
				to: getDateFromParam(req.query.to)
			});

			if (statsOrError.isErr()) {
				res.status(500).send('Internal Server Error');
			} else res.send(statsOrError.value);
		}
	);

	networkRouter.get(
		['/statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

			const to = req.query.to;
			const from = req.query.from;

			if (!isDateString(to) || !isDateString(from)) {
				res.status(400);
				res.send('invalid or missing to or from parameters');
				return;
			}

			const statsOrError = await config.getNetworkStatistics.execute({
				from: getDateFromParam(req.query.from),
				to: getDateFromParam(req.query.to)
			});
			if (statsOrError.isErr()) {
				res.status(500).send('Internal Server Error');
			} else res.send(statsOrError.value);
		}
	);

	networkRouter.get(
		['/node-snapshots'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.send(
				await nodeSnapShotter.findLatestSnapShots(
					getDateFromParam(req.query.at)
				)
			);
		}
	);

	networkRouter.get(
		['/organization-snapshots'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.send(
				await organizationSnapShotter.findLatestSnapShots(
					getDateFromParam(req.query.at)
				)
			);
		}
	);

	return networkRouter;
};

export { networkRouterWrapper as networkRouter };
