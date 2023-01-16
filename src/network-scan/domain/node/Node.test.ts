import { createDummyNode } from './__fixtures__/createDummyNode';

describe('changes', () => {
	it('should change ip if ip changed', function () {
		const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
		node.updateIpPort('newHost', 11625, new Date('2020-01-02'));
		expect(node.ip).toBe('newHost');
		expect(node.port).toBe(11625);
	});

	it('should change ip if port changed', function () {
		const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
		node.updateIpPort('localhost', 11624, new Date('2020-01-02'));
		expect(node.ip).toBe('localhost');
		expect(node.port).toBe(11624);
	});

	it('should not change ip if no changes ', function () {
		const node = createDummyNode('localhost', 11625, new Date('2020-01-01'));
		node.updateIpPort('localhost', 11625, new Date('2020-01-02'));
		expect(node.ip).toBe('localhost');
		expect(node.port).toBe(11625);
	});

	it('should not change ip if the last ip change was less than a day', function () {
		const node = createDummyNode(
			'localhost',
			11625,
			new Date('2020-01-01T00:00:00.000Z')
		);
		node.updateIpPort('newHost', 11625, new Date('2020-01-02T00:00:00.000Z'));
		node.updateIpPort('newHost2', 11625, new Date('2020-01-02T23:59:59.999Z'));
		expect(node.ip).toBe('newHost');
		expect(node.port).toBe(11625);
	});
});
