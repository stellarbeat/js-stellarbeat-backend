import * as express from 'express';
import { Router } from 'express';
import { Config } from '../../../core/config/Config';
import Kernel from '../../../core/infrastructure/Kernel';
import { Network, NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { TYPES } from '../../../core/infrastructure/di/di-types';
import OrganizationMeasurementService from '../database/repositories/OrganizationMeasurementService';
import OrganizationSnapShotter from '../database/snapshotting/OrganizationSnapShotter';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { err, ok, Result } from 'neverthrow';
import { isDateString } from '../../../core/utilities/isDateString';
import { getDateFromParam } from '../../../core/utilities/getDateFromParam';

export interface OrganizationRouterConfig {
	config: Config;
	kernel: Kernel;
}

const organizationRouterWrapper = (
	config: OrganizationRouterConfig
): Router => {
	const kernel = config.kernel;
	const organizationRouter = express.Router();

	const networkReadRepository = kernel.container.get<NetworkReadRepository>(
		TYPES.NetworkReadRepository
	);
	const organizationMeasurementService = kernel.container.get(
		OrganizationMeasurementService
	);
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

	organizationRouter.get(
		['/'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			const networkResult = await getNetwork(req.query.at);
			if (networkResult.isOk()) res.send(networkResult.value.organizations);
			else res.status(500).send('Internal Server Error: no crawl data');
		}
	);
	organizationRouter.get(
		['/:id'],
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

	organizationRouter.get(
		['/:id/snapshots'],
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

	organizationRouter.get(
		['/:id/day-statistics'],
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

	organizationRouter.get(
		['/:id/statistics'],
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

	return organizationRouter;
};

export { organizationRouterWrapper as organizationRouter };
