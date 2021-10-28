import 'reflect-metadata';

import Kernel from '../../../shared/core/Kernel';
import { getConfigFromEnv } from '../../../config/Config';
import { UpdateNetwork } from '../../useCases/updateNetwork/UpdateNetwork';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { Logger } from '../../../shared/services/PinoLogger';

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
	const updateNetworkUseCase = kernel.container.get(UpdateNetwork);
	const logger = kernel.container.get<Logger>('Logger');
	const exceptionLogger =
		kernel.container.get<ExceptionLogger>('ExceptionLogger');

	//handle shutdown gracefully
	process
		.on(
			'SIGTERM',
			shutdownGracefully('SIGTERM', updateNetworkUseCase, kernel, logger)
		)
		.on(
			'SIGINT',
			shutdownGracefully('SIGINT', updateNetworkUseCase, kernel, logger)
		);

	try {
		await updateNetworkUseCase.run();
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
	updateNetworkUseCase: UpdateNetwork,
	kernel: Kernel,
	logger: Logger
) {
	return () => {
		logger.info('Received shutdown signal, attempting graceful shutdown', {
			signal: signal
		});
		updateNetworkUseCase.shutDown(async () => {
			logger.info('NetworkUpdater done');
			logger.info('Shutting down kernel');
			await kernel.shutdown();
			logger.info('Done');
			process.exit(0);
		});
	};
}
