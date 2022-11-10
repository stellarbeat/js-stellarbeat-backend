import * as express from 'express';
import { param, validationResult } from 'express-validator';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { Router } from 'express';
import { ScanRepository } from '../../domain/history-archive-scan/ScanRepository';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { Url } from '../../../shared/domain/Url';
import { FileNotFoundError } from '../../domain/history-archive-scan/ScanError';

export interface HistoryScanRouterConfig {
	exceptionLogger: ExceptionLogger;
	historyArchiveScanRepository: ScanRepository;
}

const HistoryScanRouterWrapper = (config: HistoryScanRouterConfig): Router => {
	const historyScanRouter = express.Router();

	historyScanRouter.get(
		'/:url',
		[param('url').isURL()],
		async function (req: express.Request, res: express.Response) {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const urlOrError = Url.create(req.params.url);
			if (urlOrError.isErr())
				return res.status(400).json({ error: 'invalid url' });

			try {
				const scan = await config.historyArchiveScanRepository.findLatestByUrl(
					urlOrError.value.value
				);
				if (scan === null)
					return res.status(404).json({ message: 'No scan found' });

				return res.status(200).json({
					url: scan.baseUrl.value,
					startDate: scan.startDate,
					endDate: scan.endDate,
					latestVerifiedLedger: Number(scan.latestScannedLedger),
					hasGap: scan.scanError instanceof FileNotFoundError,
					gapUrl:
						scan.scanError instanceof FileNotFoundError
							? scan.scanError.url
							: null
				});
			} catch (e) {
				config.exceptionLogger.captureException(mapUnknownToError(e));
				return res.status(500).json({ error: 'something went wrong' });
			}
		}
	);

	return historyScanRouter;
};

export { HistoryScanRouterWrapper as historyScanRouter };
