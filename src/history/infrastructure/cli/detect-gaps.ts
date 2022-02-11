import Kernel from '../../../shared/core/Kernel';
import { HttpService } from '../../../shared/services/HttpService';
import { Url } from '../../../shared/domain/Url';
import { gunzipSync } from 'zlib';
import { Buffer } from 'buffer';
import { xdr } from 'stellar-base';
import { HistoryArchiveScanner } from '../../domain/HistoryArchiveScanner';
import { HistoryArchive } from '../../domain/HistoryArchive';

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
	const kernel = await Kernel.getInstance();
	const historyArchiveScanner = kernel.container.get(HistoryArchiveScanner);

	const historyBaseUrl = Url.create(
		'https://history.stellar.org/prd/core-live/core_live_001'
	);
	if (historyBaseUrl.isErr()) throw historyBaseUrl.error;

	const historyArchive = new HistoryArchive(historyBaseUrl.value);
	await historyArchiveScanner.scan(historyArchive, new Date(), 1000);
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
