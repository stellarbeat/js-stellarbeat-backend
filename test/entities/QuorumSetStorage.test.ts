import {Node} from "@stellarbeat/js-stellar-domain";
import NodeQuorumSetStorage from "../../src/entities/NodeQuorumSetStorage";

test("fromNode", () => {
    const node = new Node( 'A');
    const quorumSetStorage = NodeQuorumSetStorage.fromQuorumSet(node.quorumSet);

    expect(quorumSetStorage).toBeFalsy();
    expect(quorumSetStorage).toBeNull();
} );

test("fromValidator", () => {
    const node = new Node( 'A');
    node.quorumSet.validators.push('a');
    node.quorumSet.hashKey = 'key';
    const quorumSetStorage = NodeQuorumSetStorage.fromQuorumSet(node.quorumSet);

    expect(quorumSetStorage).toBeDefined();
    expect(quorumSetStorage!.hash).toEqual(node.quorumSet.hashKey);
    expect(quorumSetStorage!.quorumSet).toEqual(node.quorumSet);
} );