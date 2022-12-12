import Kernel from '../../../core/infrastructure/Kernel';
import {VerifySingleArchive} from "../../use-cases/verify-single-archive/VerifySingleArchive";

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
	const kernel = await Kernel.getInstance();
	const verifySingleArchive = kernel.container.get(VerifySingleArchive);
	//handle shutdown
	process
		.on('SIGTERM', async () => {
			await kernel.shutdown();
			process.exit(0);
		})
		.on('SIGINT', async () => {
			await kernel.shutdown();
			process.exit(0);
		});

	let persist = false;
	if (process.argv[2] === '1') {
		persist = true;
	}

	const historyUrl = process.argv[3];

	let fromLedger = undefined;
	if (!isNaN(Number(process.argv[4]))) {
		fromLedger = Number(process.argv[4]);
	}

	let toLedger = undefined;
	if (!isNaN(Number(process.argv[5]))) {
		toLedger = Number(process.argv[5]);
	}

	let concurrency = undefined;
	if (!isNaN(Number(process.argv[6]))) {
		concurrency = Number(process.argv[6]);
	}

	const result = await verifySingleArchive.execute({
		toLedger: toLedger,
		fromLedger: fromLedger,
		maxConcurrency: concurrency,
		historyUrl: historyUrl,
		persist: persist,
	});

	if (result.isErr()) {
		console.log(result.error);
	}
}