import 'reflect-metadata';

import Kernel from '../Kernel';
import { getConfigFromEnv } from '../Config';
import { NetworkUpdater } from '../network-updater/NetworkUpdater';
import { ExceptionLogger } from '../services/ExceptionLogger';
import { Logger } from '../services/PinoLogger';

// noinspection JSIgnoredPromiseFromCall
run();

async function run() {
	const configResult = getConfigFromEnv();
	if (configResult.isErr()) {
		console.log('Invalid configuration');
		console.log(configResult.error.message);
		return;
	}

	const config = configResult.value;
	const kernel = new Kernel();
	await kernel.initializeContainer(config);
	const networkUpdater = kernel.container.get(NetworkUpdater);
	const logger = kernel.container.get<Logger>('Logger');
	const exceptionLogger =
		kernel.container.get<ExceptionLogger>('ExceptionLogger');

	//handle shutdown gracefully
	process
		.on(
			'SIGTERM',
			shutdownGracefully('SIGTERM', networkUpdater, kernel, logger)
		)
		.on('SIGINT', shutdownGracefully('SIGINT', networkUpdater, kernel, logger));

	try {
		await networkUpdater.run();
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
	}

	logger.info('Shutting down kernel');
	await kernel.shutdown();
	logger.info('Done');
}

function shutdownGracefully(
	signal: string,
	networkUpdater: NetworkUpdater,
	kernel: Kernel,
	logger: Logger
) {
	return () => {
		logger.info('Received shutdown signal, attempting graceful shutdown', {
			signal: signal
		});
		networkUpdater.shutDown(async () => {
			logger.info('NetworkUpdater done');
			logger.info('Shutting down kernel');
			await kernel.shutdown();
			logger.info('Done');
			process.exit(0);
		});
	};
}
