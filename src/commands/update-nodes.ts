import 'reflect-metadata';

import Kernel from '../Kernel';
import { getConfigFromEnv } from '../Config';
import { BackendRunner } from '../BackendRunner';
import { ExceptionLogger } from '../services/ExceptionLogger';

enum RunState {
	updating,
	persisting
}

let receivedShutdownSignal = false;
let runState: RunState = RunState.updating;

process.on('SIGTERM', shutdown('SIGTERM')).on('SIGINT', shutdown('SIGINT'));
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
	console.log(config);
	const kernel = new Kernel();
	await kernel.initializeContainer(config);
	const backendRunner = kernel.container.get(BackendRunner);
	const exceptionLogger =
		kernel.container.get<ExceptionLogger>('ExceptionLogger');

	try {
		do {
			console.log('Start of backend run');
			console.time('run');

			runState = RunState.updating;
			const updateResult = await backendRunner.updateNodesAndOrganizations(
				config.topTierFallback
			);
			if (updateResult.isErr()) {
				console.log(
					'Error updating nodes and organizations: ' +
						updateResult.error.message
				);
				exceptionLogger.captureException(updateResult.error);
				continue; //don't persist this result and try again
			}

			runState = RunState.persisting;
			const persistResult = await backendRunner.persistUpdateResults(
				updateResult.value.crawl,
				updateResult.value.nodes,
				updateResult.value.organizations
			);
			if (persistResult.isErr()) {
				console.log(persistResult.error.message);
				exceptionLogger.captureException(persistResult.error);
			}

			console.log('end of backend run');
			console.timeEnd('run');
		} while (config.loop && !receivedShutdownSignal);
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
}

function shutdown(signal: string) {
	return () => {
		console.log(`${signal}...`);
		if (runState !== RunState.persisting) process.exit(0);
		console.log('Will shutdown after persisting');
		receivedShutdownSignal = true;
	};
}
