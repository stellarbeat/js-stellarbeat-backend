import { createDummyPublicKey } from './createDummyPublicKey';
import Node from '../Node';

export function createDummyNode(ip?: string, port?: number): Node {
	return Node.create(new Date(), createDummyPublicKey(), {
		ip: ip ?? 'ip',
		port: port ?? 1
	});
}
