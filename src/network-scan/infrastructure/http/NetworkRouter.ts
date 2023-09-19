import * as express from 'express';
import { Router } from 'express';
import { isDateString } from '../../../core/utilities/isDateString';
import { getDateFromParam } from '../../../core/utilities/getDateFromParam';
import { GetNetwork } from '../../use-cases/get-network/GetNetwork';
import { GetLatestNodeSnapshots } from '../../use-cases/get-latest-node-snapshots/GetLatestNodeSnapshots';
import { GetLatestOrganizationSnapshots } from '../../use-cases/get-latest-organization-snapshots/GetLatestOrganizationSnapshots';
import { GetMeasurementsFactory } from '../../use-cases/get-measurements/GetMeasurementsFactory';
import NetworkMeasurement from '../../domain/network/NetworkMeasurement';
import { GetMeasurementAggregations } from '../../use-cases/get-measurement-aggregations/GetMeasurementAggregations';
import { AggregationTarget } from '../../use-cases/get-measurement-aggregations/GetMeasurementAggregationsDTO';
import { query } from 'express-validator';
import { handleMeasurementsAggregationRequest } from './handleMeasurementsAggregationRequest';

export interface NetworkRouterConfig {
	getNetwork: GetNetwork;
	getMeasurementsFactory: GetMeasurementsFactory;
	getMeasurementAggregations: GetMeasurementAggregations;
	getLatestNodeSnapshots: GetLatestNodeSnapshots;
	getLatestOrganizationSnapshots: GetLatestOrganizationSnapshots;
}

const networkRouterWrapper = (config: NetworkRouterConfig): Router => {
	const networkRouter = express.Router();

	const getTime = (at?: unknown): Date => {
		return at && isDateString(at) ? getDateFromParam(at) : new Date();
	};

	networkRouter.get(
		['/'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 60); // cache for 60 seconds
			res.setHeader('Content-Type', 'application/json');
			const networkOrError = await config.getNetwork.execute({
				at: req.query.at ? getTime(req.query.at) : undefined
			});
			if (networkOrError.isErr()) res.status(500).send('Internal Server Error');
			else if (networkOrError.value === null)
				res.status(404).send('No network found');
			else res.send(networkOrError.value);
		}
	);

	networkRouter.get(
		['/month-statistics'],
		[query('from').custom(isDateString), query('to').custom(isDateString)],
		async (req: express.Request, res: express.Response) => {
			return await handleMeasurementsAggregationRequest(
				'public',
				req,
				res,
				AggregationTarget.NetworkMonth,
				config.getMeasurementAggregations
			);
		}
	);

	networkRouter.get(
		['/day-statistics'],
		[query('from').custom(isDateString), query('to').custom(isDateString)],
		async (req: express.Request, res: express.Response) => {
			return await handleMeasurementsAggregationRequest(
				'public',
				req,
				res,
				AggregationTarget.NetworkDay,
				config.getMeasurementAggregations
			);
		}
	);

	networkRouter.get(
		['/statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.setHeader('Content-Type', 'application/json');

			const useCase =
				config.getMeasurementsFactory.createFor(NetworkMeasurement);
			const to = req.query.to;
			const from = req.query.from;

			if (!isDateString(to) || !isDateString(from)) {
				res.status(400);
				res.send('invalid or missing to or from parameters');
				return;
			}

			const statsOrError = await useCase.execute({
				from: getDateFromParam(req.query.from),
				to: getDateFromParam(req.query.to),
				id: 'network'
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
			res.setHeader('Content-Type', 'application/json');

			const snapshotsOrError = await config.getLatestNodeSnapshots.execute({
				at: getDateFromParam(req.query.at)
			});
			if (snapshotsOrError.isErr())
				return res.status(500).send('Internal Server Error');
			res.send(snapshotsOrError.value);
		}
	);

	networkRouter.get(
		['/organization-snapshots'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.setHeader('Content-Type', 'application/json');
			const snapshotsOrError =
				await config.getLatestOrganizationSnapshots.execute({
					at: getDateFromParam(req.query.at)
				});
			if (snapshotsOrError.isErr())
				return res.status(500).send('Internal Server Error');
			res.send(snapshotsOrError.value);
		}
	);

	return networkRouter;
};

export { networkRouterWrapper as networkRouter };
