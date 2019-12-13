import {Node} from "@stellarbeat/js-stellar-domain";
import QuorumSetStorage from "../../src/entities/QuorumSetStorage";

test("fromNode", () => {
    let node = new Node("localhost");
    let quorumSetStorage = QuorumSetStorage.fromQuorumSet(node.quorumSet);

    expect(quorumSetStorage).toBeFalsy();
    expect(quorumSetStorage).toBeNull();
} );

test("fromValidator", () => {
    let node = new Node("localhost");
    node.quorumSet.validators.push('a');
    node.quorumSet.hashKey = 'key';
    let quorumSetStorage = QuorumSetStorage.fromQuorumSet(node.quorumSet);

    expect(quorumSetStorage).toBeDefined();
    expect(quorumSetStorage!.hash).toEqual(node.quorumSet.hashKey);
    expect(quorumSetStorage!.quorumSetJson).toEqual(node.quorumSet);
} );