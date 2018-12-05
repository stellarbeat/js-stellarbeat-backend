import { Node } from "@stellarbeat/js-stellar-domain";
declare const _default: {
    'findAllNodes': () => Promise<Node[]>;
    'addNode': (node: Node) => Promise<void>;
    'destroyConnection': () => Promise<void>;
    'deleteAllNodes': () => Promise<void>;
};
export default _default;
