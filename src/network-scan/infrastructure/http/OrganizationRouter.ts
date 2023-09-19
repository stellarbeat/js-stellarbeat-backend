import * as express from 'express';
import { Router } from 'express';
import { getDateFromParam } from '../../../core/utilities/getDateFromParam';
import { isString } from '../../../core/utilities/TypeGuards';
import { isDateString } from '../../../core/utilities/isDateString';
import { GetOrganization } from '../../use-cases/get-organization/GetOrganization';
import { GetOrganizations } from '../../use-cases/get-organizations/GetOrganizations';
import { GetOrganizationSnapshots } from '../../use-cases/get-organization-snapshots/GetOrganizationSnapshots';
import { GetMeasurementsFactory } from '../../use-cases/get-measurements/GetMeasurementsFactory';
import OrganizationMeasurement from '../../domain/organization/OrganizationMeasurement';
import { GetMeasurementAggregations } from '../../use-cases/get-measurement-aggregations/GetMeasurementAggregations';
import { param, query } from 'express-validator';
import { AggregationTarget } from '../../use-cases/get-measurement-aggregations/GetMeasurementAggregationsDTO';
import { handleMeasurementsAggregationRequest } from './handleMeasurementsAggregationRequest';

export interface OrganizationRouterConfig {
	getOrganization: GetOrganization;
	getOrganizations: GetOrganizations;
	getOrganizationSnapshots: GetOrganizationSnapshots;
	getMeasurementsFactory: GetMeasurementsFactory;
	getMeasurementAggregations: GetMeasurementAggregations;
}

const organizationRouterWrapper = (
	config: OrganizationRouterConfig
): Router => {
	const organizationRouter = express.Router();

	organizationRouter.get(
		['/'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.setHeader('Content-Type', 'application/json');
			const organizationsOrErrors = await config.getOrganizations.execute({
				at: req.query.at ? getDateFromParam(req.query.at) : undefined
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
			res.setHeader('Content-Type', 'application/json');
			if (!isString(req.params.id)) return res.status(400).send('Bad Request');

			const organizationOrError = await config.getOrganization.execute({
				at: req.query.at ? getDateFromParam(req.query.at) : undefined,
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
			res.setHeader('Content-Type', 'application/json');
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
		[
			query('from').custom(isDateString),
			query('to').custom(isDateString),
			param('id').isString()
		],
		async (req: express.Request, res: express.Response) => {
			return await handleMeasurementsAggregationRequest(
				req.params.id,
				req,
				res,
				AggregationTarget.OrganizationDay,
				config.getMeasurementAggregations
			);
		}
	);

	organizationRouter.get(
		['/:id/statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

			const useCase = config.getMeasurementsFactory.createFor(
				OrganizationMeasurement
			);
			const to = req.query.to;
			const from = req.query.from;
			const id = req.params.id;

			if (!isString(id)) {
				return res.status(400).send('Bad Request');
			}

			if (!isDateString(to) || !isDateString(from)) {
				res.status(400);
				return res.send('invalid or missing to or from parameters');
			}

			const statsOrError = await useCase.execute({
				from: getDateFromParam(req.query.from),
				to: getDateFromParam(req.query.to),
				id: id
			});

			if (statsOrError.isErr()) {
				return res.status(500).send('Internal Server Error');
			} else return res.json(statsOrError.value);
		}
	);

	return organizationRouter;
};

export { organizationRouterWrapper as organizationRouter };
