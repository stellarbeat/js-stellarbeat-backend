import {Node} from "@stellarbeat/js-stellar-domain";
import NodeQuorumSetStorage from "../../src/entities/NodeQuorumSetStorage";

test("fromNode", () => {
    let node = new Node("localhost", 1 , 'A');
    let quorumSetStorage = NodeQuorumSetStorage.fromQuorumSet(node.quorumSet);

    expect(quorumSetStorage).toBeFalsy();
    expect(quorumSetStorage).toBeNull();
} );

test("fromValidator", () => {
    let node = new Node("localhost", 1, 'A');
    node.quorumSet.validators.push('a');
    node.quorumSet.hashKey = 'key';
    let quorumSetStorage = NodeQuorumSetStorage.fromQuorumSet(node.quorumSet);

    expect(quorumSetStorage).toBeDefined();
    expect(quorumSetStorage!.hash).toEqual(node.quorumSet.hashKey);
    expect(quorumSetStorage!.quorumSet).toEqual(node.quorumSet);
} );