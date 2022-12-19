import * as express from 'express';
import { Router } from 'express';
import { isDateString } from '../../../core/utilities/isDateString';
import { getDateFromParam } from '../../../core/utilities/getDateFromParam';
import { GetNetwork } from '../../use-cases/get-network/GetNetwork';
import { GetNetworkMonthStatistics } from '../../use-cases/get-network-month-statistics/GetNetworkMonthStatistics';
import { GetNetworkDayStatistics } from '../../use-cases/get-network-day-statistics/GetNetworkDayStatistics';
import { GetLatestNodeSnapshots } from '../../use-cases/get-latest-node-snapshots/GetLatestNodeSnapshots';
import { GetLatestOrganizationSnapshots } from '../../use-cases/get-latest-organization-snapshots/GetLatestOrganizationSnapshots';
import { GetMeasurementsFactory } from '../../use-cases/get-measurements/GetMeasurementsFactory';

export interface NetworkRouterConfig {
	getNetwork: GetNetwork;
	getNetworkMonthStatistics: GetNetworkMonthStatistics;
	getNetworkDayStatistics: GetNetworkDayStatistics;
	getMeasurementsFactory: GetMeasurementsFactory;
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
			const networkOrError = await config.getNetwork.execute({
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
			await handleGetNetworkStatisticsRequest(
				req,
				res,
				config.getNetworkMonthStatistics
			);
		}
	);

	networkRouter.get(
		['/day-statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

			await handleGetNetworkStatisticsRequest(
				req,
				res,
				config.getNetworkDayStatistics
			);
		}
	);

	networkRouter.get(
		['/statistics'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header

			throw new Error('not implemented');
			/*await handleGetNetworkStatisticsRequest(
				req,
				res,
				config.getNetworkStatistics
			);*/
		}
	);

	networkRouter.get(
		['/node-snapshots'],
		async (req: express.Request, res: express.Response) => {
			res.setHeader('Cache-Control', 'public, max-age=' + 30); // cache header
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

const handleGetNetworkStatisticsRequest = async <
	T extends GetNetworkDayStatistics | GetNetworkMonthStatistics
>(
	req: express.Request,
	res: express.Response,
	useCase: T
) => {
	const to = req.query.to;
	const from = req.query.from;

	if (!isDateString(to) || !isDateString(from)) {
		res.status(400);
		res.send('invalid or missing to or from parameters');
		return;
	}

	const statsOrError = await useCase.execute({
		from: getDateFromParam(req.query.from),
		to: getDateFromParam(req.query.to)
	});

	if (statsOrError.isErr()) {
		res.status(500).send('Internal Server Error');
	} else res.send(statsOrError.value);
};

export { networkRouterWrapper as networkRouter };
