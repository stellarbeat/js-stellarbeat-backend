import { NodeScanProps } from './NodeScanProps';
import { TomlNodeInfo } from './../../network/scan/TomlService';

export class NodeTomlInfoMapper {
	static updateNodeScanPropsFromTomlInfo(
		nodeScanProps: NodeScanProps,
		tomlInfo: TomlNodeInfo
	) {
		if (nodeScanProps.homeDomain !== tomlInfo.homeDomain) return;

		nodeScanProps.alias = tomlInfo.alias;
		nodeScanProps.historyArchiveUrl = tomlInfo.historyUrl;
		nodeScanProps.name = tomlInfo.name;
		nodeScanProps.host = tomlInfo.host;
	}
}
