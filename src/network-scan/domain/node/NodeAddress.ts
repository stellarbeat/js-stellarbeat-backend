import { ValueObject } from '../../../core/domain/ValueObject';
import { Result, ok, err } from 'neverthrow';
import validator from 'validator';

export class NodeAddress extends ValueObject {
	private constructor(
		public readonly ip: string,
		public readonly port: number
	) {
		super();
	}

	static create(ip: string, port: number): Result<NodeAddress, Error> {
		if (!validator.isIP(ip)) return err(new Error('Invalid IP ' + ip));
		if (!validator.isPort(port.toString()))
			return err(new Error('Invalid port ' + port));

		return ok(new NodeAddress(ip, port));
	}
}
