import * as express from 'express';
import { Router } from 'express';
import { getDateFromParam } from '../../../core/utilities/getDateFromParam';
import { GetNode } from '../../use-cases/get-node/GetNode';
import { GetNodes } from '../../use-cases/get-nodes/GetNodes';
import { isString } from '../../../core/utilities/TypeGuards';
import { GetNodeSnapshots } from '../../use-cases/get-node-snapshots/GetNodeSnapshots';
import { isDateString } from '../../../core/utilities/isDateString';
import { GetMeasurementsFactory } from '../../use-cases/get-measurements/GetMeasurementsFactory';
import NodeMeasurement from '../../domain/node/NodeMeasurement';
import { GetMeasurementAggregations } from '../../use-cases/get-measurement-aggregations/GetMeasurementAggregations';
import { param, query } from 'express-validator';
import { AggregationTarget } from '../../use-cases/get-measurement-aggregations/GetMeasurementAggregationsDTO';
import { handleMeasurementsAggregationRequest } from './handleMeasurementsAggregationRequest';

export interface NodeRouterConfig {
	getNode: GetNode;
	getNodes: GetNodes;
	getNodeSnapshots: GetNodeSnapshots;
	getMeasurementsFactory: GetMeasurementsFactory;
	getMeasurementAggregations: GetMeasurementAggregations;
}

const nodeRouterWrapper = (config: NodeRouterConfig): Router => {
	const nodeRouter = express.Router();

	nodeRouter.get(['/'], async (req: express.Request, res: express.Response) => {
		res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
		res.setHeader('Content-Type', 'application/json');
		const nodesOrError = await config.getNodes.execute({
			at: req.query.at ? getDateFromParam(req.query.at) : undefined
		});
		if (nodesOrError.isErr())
			return res.status(500).send('Internal Server Error');

		return res.status(200).send(nodesOrError.value);
	});

	nodeRouter.get(
		['/:publicKey'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.setHeader('Content-Type', 'application/json');
			if (!isString(req.params.publicKey))
				return res.status(400).send('Bad Request');

			const nodeOrError = await config.getNode.execute({
				at: req.query.at ? getDateFromParam(req.query.at) : undefined,
				publicKey: req.params.publicKey
			});

			if (nodeOrError.isErr())
				return res.status(500).send('Internal Server Error');

			if (nodeOrError.value === null) return res.status(404).send('Not Found');

			return res.status(200).send(nodeOrError.value);
		}
	);

	nodeRouter.get(
		['/:publicKey/snapshots'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.setHeader('Content-Type', 'application/json');
			if (!isString(req.params.publicKey))
				return res.status(400).send('Bad Request');

			const nodeSnapshotsOrError = await config.getNodeSnapshots.execute({
				at: getDateFromParam(req.query.at),
				publicKey: req.params.publicKey
			});

			if (nodeSnapshotsOrError.isErr())
				return res.status(500).send('Internal Server Error');

			return res.status(200).send(nodeSnapshotsOrError.value);
		}
	);

	nodeRouter.get(
		['/:publicKey/day-statistics'],
		[
			query('from').custom(isDateString),
			query('to').custom(isDateString),
			param('publicKey').isString()
		],
		async (req: express.Request, res: express.Response) => {
			return await handleMeasurementsAggregationRequest(
				req.params.publicKey,
				req,
				res,
				AggregationTarget.NodeDay,
				config.getMeasurementAggregations
			);
		}
	);

	nodeRouter.get(
		['/:publicKey/statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			res.setHeader('Content-Type', 'application/json');
			const to = req.query.to;
			const from = req.query.from;
			const publicKey = req.params.publicKey;
			if (!isString(publicKey)) {
				return res.status(400).send('Bad Request');
			}

			if (!isDateString(to) || !isDateString(from)) {
				res.status(400);
				res.send('invalid or missing to or from parameters');
				return;
			}

			const statsOrError = await config.getMeasurementsFactory
				.createFor(NodeMeasurement)
				.execute({
					from: getDateFromParam(from),
					to: getDateFromParam(to),
					id: publicKey
				});

			if (statsOrError.isErr()) {
				res.status(500).send('Internal Server Error');
			} else res.send(statsOrError.value);
		}
	);

	return nodeRouter;
};

export { nodeRouterWrapper as nodeRouter };
