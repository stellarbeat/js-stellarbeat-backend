import 'reflect-metadata';

import Kernel from '../../../shared/core/Kernel';
import { UpdateNetwork } from '../../use-cases/update-network/UpdateNetwork';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { Logger } from '../../../shared/services/PinoLogger';

// noinspection JSIgnoredPromiseFromCall
run();

async function run() {
	const kernel = await Kernel.getInstance();
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
		await updateNetworkUseCase.execute();
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
