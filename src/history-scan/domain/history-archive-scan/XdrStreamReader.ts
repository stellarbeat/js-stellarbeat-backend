import { Writable } from 'stream';

export class XdrStreamReader extends Writable {
	private remainingBuffer: Buffer = Buffer.from([]);

	public xdrBuffers: Buffer[] = [];
	constructor() {
		super();
	}

	_write(
		xdrChunk: Buffer,
		encoding: string,
		callback: (error?: Error | null) => void
	): void {
		let buffer = Buffer.concat([this.remainingBuffer, xdrChunk]);

		let nextMessageLength = this.getMessageLengthFromXDRBuffer(buffer);

		while (nextMessageLength !== 0 && buffer.length - 4 >= nextMessageLength) {
			let xdrBuffer: Buffer;
			[xdrBuffer, buffer] = this.getXDRBuffer(buffer, nextMessageLength);
			this.xdrBuffers.push(xdrBuffer);
			nextMessageLength = this.getMessageLengthFromXDRBuffer(buffer);
		}
		this.remainingBuffer = buffer;

		return callback();
	}

	getMessageLengthFromXDRBuffer(buffer: Buffer): number {
		if (buffer.length < 4) return 0;

		const length = buffer.slice(0, 4);
		length[0] &= 0x7f; //clear xdr continuation bit
		return length.readUInt32BE(0);
	}

	getXDRBuffer(buffer: Buffer, messageLength: number): [Buffer, Buffer] {
		return [
			buffer.slice(4, messageLength + 4),
			buffer.slice(4 + messageLength)
		];
	}
}
