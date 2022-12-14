import * as express from 'express';
import { Router } from 'express';
import { Config } from '../../../core/config/Config';
import Kernel from '../../../core/infrastructure/Kernel';
import NodeMeasurementService from '../database/repositories/NodeMeasurementService';
import { getDateFromParam } from '../../../core/utilities/getDateFromParam';
import { GetNode } from '../../use-cases/get-node/GetNode';
import { GetNodes } from '../../use-cases/get-nodes/GetNodes';
import { isString } from '../../../core/utilities/TypeGuards';
import { GetNodeSnapshots } from '../../use-cases/get-node-snapshots/GetNodeSnapshots';

export interface NodeRouterConfig {
	config: Config;
	kernel: Kernel;
	getNode: GetNode;
	getNodes: GetNodes;
	getNodeSnapshots: GetNodeSnapshots;
}

const nodeRouterWrapper = (config: NodeRouterConfig): Router => {
	const kernel = config.kernel;
	const nodeRouter = express.Router();

	const nodeMeasurementService = kernel.container.get(NodeMeasurementService);

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
