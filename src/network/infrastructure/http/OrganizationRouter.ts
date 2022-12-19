import * as express from 'express';
import { Router } from 'express';
import { getDateFromParam } from '../../../core/utilities/getDateFromParam';
import { isString } from '../../../core/utilities/TypeGuards';
import { isDateString } from '../../../core/utilities/isDateString';
import { GetOrganization } from '../../use-cases/get-organization/GetOrganization';
import { GetOrganizations } from '../../use-cases/get-organizations/GetOrganizations';
import { GetOrganizationSnapshots } from '../../use-cases/get-organization-snapshots/GetOrganizationSnapshots';
import { GetOrganizationDayStatistics } from '../../use-cases/get-organization-day-statistics/GetOrganizationDayStatistics';
import { GetMeasurementsFactory } from '../../use-cases/get-measurements/GetMeasurementsFactory';

export interface OrganizationRouterConfig {
	getOrganization: GetOrganization;
	getOrganizations: GetOrganizations;
	getOrganizationSnapshots: GetOrganizationSnapshots;
	getOrganizationDayStatistics: GetOrganizationDayStatistics;
	getMeasurementsFactory: GetMeasurementsFactory;
}

const organizationRouterWrapper = (
	config: OrganizationRouterConfig
): Router => {
	const organizationRouter = express.Router();

	organizationRouter.get(
		['/'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			const organizationsOrErrors = await config.getOrganizations.execute({
				at: getDateFromParam(req.query.at)
			});
			if (organizationsOrErrors.isErr())
				return res.status(500).send('Internal Server Error');

			return res.status(200).send(organizationsOrErrors.value);
		}
	);
	organizationRouter.get(
		['/:id'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			if (!isString(req.params.id)) return res.status(400).send('Bad Request');

			const organizationOrError = await config.getOrganization.execute({
				at: getDateFromParam(req.query.at),
				organizationId: req.params.id
			});

			if (organizationOrError.isErr())
				return res.status(500).send('Internal Server Error');

			if (organizationOrError.value === null)
				return res.status(404).send('Not Found');

			return res.status(200).send(organizationOrError.value);
		}
	);

	organizationRouter.get(
		['/:id/snapshots'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			if (!isString(req.params.id)) return res.status(400).send('Bad Request');

			const organizationSnapshotsOrError =
				await config.getOrganizationSnapshots.execute({
					at: getDateFromParam(req.query.at),
					organizationId: req.params.id
				});

			if (organizationSnapshotsOrError.isErr())
				return res.status(500).send('Internal Server Error');

			return res.status(200).send(organizationSnapshotsOrError.value);
		}
	);

	organizationRouter.get(
		['/:id/day-statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			return handleGetOrganizationStatisticsRequest(
				req,
				res,
				config.getOrganizationDayStatistics
			);
		}
	);

	organizationRouter.get(
		['/:id/statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			throw new Error('NOT IMPLEMENTED');
			/*return await handleGetOrganizationStatisticsRequest(
				req,
				res,
				config.getOrganizationStatistics
			);*/
		}
	);

	return organizationRouter;
};

const handleGetOrganizationStatisticsRequest = async <
	T extends GetOrganizationDayStatistics
>(
	req: express.Request,
	res: express.Response,
	useCase: T
) => {
	const to = req.query.to;
	const from = req.query.from;
	const id = req.params.id;
	if (!isString(id)) {
		return res.status(400).send('Bad Request');
	}

	if (!isDateString(to) || !isDateString(from)) {
		res.status(400);
		res.send('invalid or missing to or from parameters');
		return;
	}

	const statsOrError = await useCase.execute({
		from: getDateFromParam(req.query.from),
		to: getDateFromParam(req.query.to),
		organizationId: id
	});

	if (statsOrError.isErr()) {
		res.status(500).send('Internal Server Error');
	} else res.send(statsOrError.value);
};

export { organizationRouterWrapper as organizationRouter };
