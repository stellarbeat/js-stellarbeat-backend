import * as express from 'express';
import { Router } from 'express';
import { getDateFromParam } from '../../../core/utilities/getDateFromParam';
import { GetNode } from '../../use-cases/get-node/GetNode';
import { GetNodes } from '../../use-cases/get-nodes/GetNodes';
import { isString } from '../../../core/utilities/TypeGuards';
import { GetNodeSnapshots } from '../../use-cases/get-node-snapshots/GetNodeSnapshots';
import { GetNodeStatistics } from '../../use-cases/get-node-statistics/GetNodeStatistics';
import { GetNodeDayStatistics } from '../../use-cases/get-node-day-statistics/GetNodeDayStatistics';
import { isDateString } from '../../../core/utilities/isDateString';

export interface NodeRouterConfig {
	getNode: GetNode;
	getNodes: GetNodes;
	getNodeSnapshots: GetNodeSnapshots;
	getNodeDayStatistics: GetNodeDayStatistics;
	getNodeStatistics: GetNodeStatistics;
}

const nodeRouterWrapper = (config: NodeRouterConfig): Router => {
	const nodeRouter = express.Router();

	nodeRouter.get(['/'], async (req: express.Request, res: express.Response) => {
		res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
		const nodesOrError = await config.getNodes.execute({
			at: getDateFromParam(req.query.at)
		});
		if (nodesOrError.isErr())
			return res.status(500).send('Internal Server Error');

		return res.status(200).send(nodesOrError.value);
	});

	nodeRouter.get(
		['/:publicKey'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			if (!isString(req.params.publicKey))
				return res.status(400).send('Bad Request');

			const nodeOrError = await config.getNode.execute({
				at: getDateFromParam(req.query.at),
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
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			return handleGetNodeStatisticsRequest(
				req,
				res,
				config.getNodeDayStatistics
			);
		}
	);

	nodeRouter.get(
		['/:publicKey/statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
			return handleGetNodeStatisticsRequest(req, res, config.getNodeStatistics);
		}
	);

	return nodeRouter;
};

const handleGetNodeStatisticsRequest = async <
	T extends GetNodeDayStatistics | GetNodeStatistics
>(
	req: express.Request,
	res: express.Response,
	useCase: T
) => {
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

	const statsOrError = await useCase.execute({
		from: getDateFromParam(req.query.from),
		to: getDateFromParam(req.query.to),
		publicKey: publicKey
	});

	if (statsOrError.isErr()) {
		res.status(500).send('Internal Server Error');
	} else res.send(statsOrError.value);
};

export { nodeRouterWrapper as nodeRouter };
