import Kernel from '../../../shared/core/Kernel';
import { HttpService } from '../../../shared/services/HttpService';
import { Url } from '../../../shared/domain/Url';
import { gunzipSync } from 'zlib';
import { Buffer } from 'buffer';
import { xdr } from 'stellar-base';
import { HistoryArchiveScanner } from '../../domain/HistoryArchiveScanner';
import { HistoryArchive } from '../../domain/HistoryArchive';
import { ScanGaps } from '../../use-cases/scan-gaps/ScanGaps';

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
	const kernel = await Kernel.getInstance();
	const scanGaps = kernel.container.get(ScanGaps);

	if (process.argv.length < 5) {
		console.log(
			'parameters missing: historyUrl fromLedger toLedger concurrency'
		);
		process.exit(22);
	}

	const historyUrl = process.argv[2];

	if (isNaN(Number(process.argv[3]))) {
		console.log('fromLedger not a number');
		process.exit(22);
	}
	const fromLedger = Number(process.argv[3]);

	if (isNaN(Number(process.argv[4]))) {
		console.log('toLedger not a number');
		process.exit(22);
	}
	const toLedger = Number(process.argv[4]);

	if (isNaN(Number(process.argv[5]))) {
		console.log('concurrency not a number');
		process.exit(22);
	}
	const concurrency = Number(process.argv[5]);

	const result = await scanGaps.execute({
		date: new Date(),
		toLedger: toLedger,
		fromLedger: fromLedger,
		concurrency: concurrency,
		historyUrl: historyUrl
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

function getMessageLengthFromXDRBuffer(buffer: Buffer): number {
	if (buffer.length < 4) return 0;

	const length = buffer.slice(0, 4);
	length[0] &= 0x7f; //clear xdr continuation bit
	return length.readUInt32BE(0);
}

function getXDRBuffer(buffer: Buffer, messageLength: number): [Buffer, Buffer] {
	return [buffer.slice(4, messageLength + 4), buffer.slice(4 + messageLength)];
}
