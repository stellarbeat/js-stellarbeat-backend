import Kernel from '../../../shared/core/Kernel';
import { ScanGaps } from '../../use-cases/scan-gaps/ScanGaps';

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
	const kernel = await Kernel.getInstance();
	const scanGaps = kernel.container.get(ScanGaps);
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

	let loop = false;
	if (process.argv[3] === '1') {
		loop = true;
	}

	const historyUrl = process.argv[4];

	let fromLedger = undefined;
	if (!isNaN(Number(process.argv[5]))) {
		fromLedger = Number(process.argv[5]);
	}

	let toLedger = undefined;
	if (!isNaN(Number(process.argv[6]))) {
		toLedger = Number(process.argv[6]);
	}

	let concurrency = undefined;
	if (!isNaN(Number(process.argv[7]))) {
		concurrency = Number(process.argv[7]);
	}

	const result = await scanGaps.execute({
		toLedger: toLedger,
		fromLedger: fromLedger,
		maxConcurrency: concurrency,
		historyUrl: historyUrl,
		persist: persist,
		loop: loop
	});

	if (result.isErr()) {
		console.log(result.error);
	}

	/*
	const resultOrError = await httpService.get(url);

	if (resultOrError.isErr()) return;

	const buffer = resultOrError.value.data;
	if (!(buffer instanceof Buffer)) return;

	console.log('inflating');
	const inflated = gunzipSync(buffer);
	console.log(inflated);
	const length = getMessageLengthFromXDRBuffer(inflated);
	console.log(length);
	const [xdrBuffer, remaining] = getXDRBuffer(inflated, length);
	console.log(xdrBuffer.toString('base64'));
	const xdr = LedgerHeaderHistoryEntry.fromXDR(xdrBuffer);
	console.log(xdr);*/
}

/*function getMessageLengthFromXDRBuffer(buffer: Buffer): number {
	if (buffer.length < 4) return 0;

	const length = buffer.slice(0, 4);
	length[0] &= 0x7f; //clear xdr continuation bit
	return length.readUInt32BE(0);
}

function getXDRBuffer(buffer: Buffer, messageLength: number): [Buffer, Buffer] {
	return [buffer.slice(4, messageLength + 4), buffer.slice(4 + messageLength)];
}*/
