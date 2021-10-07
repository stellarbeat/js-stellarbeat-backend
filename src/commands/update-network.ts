import 'reflect-metadata';

import Kernel from '../Kernel';
import { getConfigFromEnv } from '../Config';
import { NetworkUpdater } from '../NetworkUpdater';
import { ExceptionLogger } from '../services/ExceptionLogger';

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
	process
		.on('SIGTERM', shutdownSafely('SIGTERM', networkUpdater))
		.on('SIGINT', shutdownSafely('SIGINT', networkUpdater));
	const exceptionLogger =
		kernel.container.get<ExceptionLogger>('ExceptionLogger');

	try {
		await networkUpdater.run();
	} catch (error) {
		if (error instanceof Error) {
			console.log('Unexpected error: ', error.message);
			exceptionLogger.captureException(error);
		} else {
			console.log('Unexpected error');
			exceptionLogger.captureException(
				new Error('Unexpected error during backend run: ' + error)
			);
		}
	}

	await kernel.shutdown();
	console.log('end of script');
}

function shutdownSafely(signal: string, backendWorker: NetworkUpdater) {
	return () => {
		console.log(`${signal}...`);
		console.log('Attempting safe shutdown');
		backendWorker.shutDown(() => {
			console.log('Can safely exit');
			process.exit(0);
		});
	};
}
