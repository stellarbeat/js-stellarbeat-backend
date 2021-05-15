import {Node} from "@stellarbeat/js-stellar-domain";
import NodeDetailsStorage from "../../src/entities/NodeDetailsStorage";


test("fromGhostNode", () => {
    let node = new Node('A', "localhost", 1);
    expect(NodeDetailsStorage.fromNode(node)).toBeNull();
    expect(NodeDetailsStorage.fromNode(node)).toBeFalsy();
} );

test("fromNode", () => {
    let node = new Node('A', "localhost", 1);
    node.ledgerVersion = 1;
    node.overlayMinVersion = 2;
    node.overlayVersion = 3;
    node.versionStr = '4';
    let nodeDetails = NodeDetailsStorage.fromNode(node);

    expect(nodeDetails!.ledgerVersion).toEqual(1);
    expect(nodeDetails!.overlayMinVersion).toEqual(2);
    expect(nodeDetails!.overlayVersion).toEqual(3);
    expect(nodeDetails!.versionStr).toEqual('4');
} );