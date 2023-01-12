import 'reflect-metadata';

import Kernel from '../../../core/infrastructure/Kernel';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { Logger } from '../../../core/services/PinoLogger';
import { ScanNetwork } from '../../use-cases/scan-network/ScanNetwork';

// noinspection JSIgnoredPromiseFromCall
run();

async function run() {
	const kernel = await Kernel.getInstance();
	const useCase = kernel.container.get(ScanNetwork);
	const logger = kernel.container.get<Logger>('Logger');
	const exceptionLogger =
		kernel.container.get<ExceptionLogger>('ExceptionLogger');

	const loopString = process.argv[2];
	const loop = loopString === '1';

	const dryRunString = process.argv[3];
	const dryRun = dryRunString === '1';

	//handle shutdown gracefully
	process
		.on('SIGTERM', shutdownGracefully('SIGTERM', useCase, kernel, logger))
		.on('SIGINT', shutdownGracefully('SIGINT', useCase, kernel, logger));

	try {
		await useCase.execute({
			loop: loop,
			dryRun: dryRun
		});
	} catch (error) {
		const message = 'Unexpected error while updating network';
		if (error instanceof Error) {
			logger.error(message, { errorMessage: error.message });
			exceptionLogger.captureException(error);
		} else {
			logger.error(message);
			exceptionLogger.captureException(
				new Error('Unexpected error during backend run: ' + error)
			);
		}
		shutdownGracefully('UNEXPECTED_ERROR', useCase, kernel, logger);
	}

	logger.info('Shutting down kernel');
	await kernel.shutdown();
	logger.info('Done');
}

function shutdownGracefully(
	signal: string,
	scanNetwork: ScanNetwork,
	kernel: Kernel,
	logger: Logger
) {
	return () => {
		logger.info('Received shutdown signal, attempting graceful shutdown', {
			signal: signal
		});
		scanNetwork.shutDown(async () => {
			logger.info('NetworkUpdater done');
			logger.info('Shutting down kernel');
			await kernel.shutdown();
			logger.info('Done');
			process.exit(0);
		});
	};
}