import * as express from 'express';
import { Router } from 'express';
import { param, validationResult } from 'express-validator';
import { GetLatestScan } from '../../use-cases/get-latest-scan/GetLatestScan';
import { InvalidUrlError } from '../../use-cases/get-latest-scan/InvalidUrlError';

export interface HistoryScanRouterConfig {
	getLatestScan: GetLatestScan;
}

const HistoryScanRouterWrapper = (config: HistoryScanRouterConfig): Router => {
	const historyScanRouter = express.Router();

	historyScanRouter.get(
		'/:url',
		[param('url').isURL()],
		async function (req: express.Request, res: express.Response) {
			res.setHeader('Cache-Control', 'public, max-age=' + 60);
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const scanOrError = await config.getLatestScan.execute({
				url: req.params.url
			});

			if (scanOrError.isErr() && scanOrError.error instanceof InvalidUrlError)
				return res.status(400).json({ error: 'Invalid url' });
			if (scanOrError.isErr())
				return res.status(500).json({ error: 'Internal server error' });

			if (scanOrError.value === null)
				return res.status(204).json({ message: 'No scan found for url' });

			return res.status(200).json(scanOrError.value);
		}
	);

	return historyScanRouter;
};

export { HistoryScanRouterWrapper as historyScanRouter };
