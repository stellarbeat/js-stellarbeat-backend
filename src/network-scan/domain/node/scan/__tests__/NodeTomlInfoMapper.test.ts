import { NodeScanProps } from '../NodeScanProps';
import { createDummyPublicKeyString } from '../../__fixtures__/createDummyPublicKey';
import { NodeTomlInfoMapper } from '../NodeTomlInfoMapper';
import { TomlNodeInfo } from './../../../network/scan/TomlService';

describe('NodeTomlInfoMapper', () => {
	it('should update NodeScanProps', function () {
		const domain = 'domain';
		const publicKey = createDummyPublicKeyString();
		const nodeScanProps = createProps(publicKey, domain);

		const nodeTomlInfo: TomlNodeInfo = createNodeInfo(publicKey, domain);

		NodeTomlInfoMapper.updateNodeScanPropsFromTomlInfo(
			nodeScanProps,
			nodeTomlInfo
		);
		expect(nodeScanProps.alias).toEqual('alias');
		expect(nodeScanProps.host).toEqual('host');
		expect(nodeScanProps.historyArchiveUrl).toEqual('historyUrl');
		expect(nodeScanProps.name).toEqual('name');
	});

	it('should not update NodeScanProps if homeDomain is different', function () {
		const publicKey = createDummyPublicKeyString();
		const domain = 'domain';
		const nodeScanProps = createProps(publicKey, domain);
		const nodeTomlInfo: TomlNodeInfo = createNodeInfo(publicKey, 'otherDomain');

		NodeTomlInfoMapper.updateNodeScanPropsFromTomlInfo(
			nodeScanProps,
			nodeTomlInfo
		);
		expect(nodeScanProps.alias).toEqual(null);
		expect(nodeScanProps.host).toEqual(null);
		expect(nodeScanProps.historyArchiveUrl).toEqual(null);
		expect(nodeScanProps.name).toEqual(null);
	});
});

function createProps(publicKey: string, domain: string): NodeScanProps {
	return {
		name: null,
		host: null,
		alias: null,
		homeDomain: domain,
		historyArchiveUrl: null,
		ip: 'localhost',
		geoData: null,
		ledgerVersion: 1,
		isp: null,
		overlayMinVersion: 1,
		overlayVersion: 1,
		port: 1,
		quorumSet: null,
		publicKey: publicKey,
		quorumSetHash: null,
		stellarCoreVersion: '1.0.0'
	};
}

function createNodeInfo(publicKey: string, domain: string): TomlNodeInfo {
	return {
		alias: 'alias',
		host: 'host',
		historyUrl: 'historyUrl',
		name: 'name',
		publicKey: publicKey,
		homeDomain: domain
	};
}
