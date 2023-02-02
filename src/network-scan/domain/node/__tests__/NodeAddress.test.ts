import { NodeAddress } from '../NodeAddress';

describe('NodeAddress', () => {
	it('should create NodeAddress from valid ip and port', function () {
		const nodeAddressOrError = NodeAddress.create('127.0.0.1', 11625);

		expect(nodeAddressOrError.isOk()).toBeTruthy();
		if (!nodeAddressOrError.isOk()) return;
		expect(nodeAddressOrError.value.ip).toEqual('127.0.0.1');
		expect(nodeAddressOrError.value.port).toEqual(11625);
	});

	it('should not create NodeAddress from invalid ip', function () {
		const nodeAddressOrError = NodeAddress.create('invalid', 11625);

		expect(nodeAddressOrError.isErr()).toBeTruthy();
		if (!nodeAddressOrError.isErr()) return;
		expect(nodeAddressOrError.error).toBeInstanceOf(Error);
	});

	it('should not create NodeAddress from invalid port', function () {
		const nodeAddressOrError = NodeAddress.create('127.0.0.1', -1);

		expect(nodeAddressOrError.isErr()).toBeTruthy();
		if (!nodeAddressOrError.isErr()) return;
		expect(nodeAddressOrError.error).toBeInstanceOf(Error);
	});

	it('should equal NodeAddress with same ip and port', function () {
		const nodeAddressOrError = NodeAddress.create('127.0.0.1', 11625);

		expect(nodeAddressOrError.isOk()).toBeTruthy();
		if (!nodeAddressOrError.isOk()) return;
		const equalNodeAddressOrError = NodeAddress.create('127.0.0.1', 11625);

		expect(equalNodeAddressOrError.isOk()).toBeTruthy();
		if (!equalNodeAddressOrError.isOk()) return;

		expect(
			nodeAddressOrError.value.equals(equalNodeAddressOrError.value)
		).toBeTruthy();
	});
});
