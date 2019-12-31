import SnapShotterTemplate from "./SnapShotterTemplate";
import NodeSnapShotRepository from "../../repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../../factory/NodeSnapShotFactory";
import {Repository} from "typeorm";
import NodePublicKeyStorage from "../../entities/NodePublicKeyStorage";
import OrganizationIdStorage from "../../entities/OrganizationIdStorage";
import CrawlV2 from "../../entities/CrawlV2";
import {Node, OrganizationId, PublicKey} from "@stellarbeat/js-stellar-domain";
import NodeSnapShot from "../../entities/NodeSnapShot";
import olderThanOneDay from "../../filters/OlderThanOneDay";

export default class NodeSnapShotter extends SnapShotterTemplate {

    protected nodeSnapShotRepository: NodeSnapShotRepository;
    protected nodeSnapShotFactory: NodeSnapShotFactory;
    protected nodePublicKeyStorageRepository: Repository<NodePublicKeyStorage>;
    protected organizationIdStorageRepository: Repository<OrganizationIdStorage>;

    constructor(
        nodeSnapShotRepository: NodeSnapShotRepository,
        nodeSnapShotFactory: NodeSnapShotFactory,
        nodePublicKeyStorageRepository: Repository<NodePublicKeyStorage>,
        organizationIdStorageRepository: Repository<OrganizationIdStorage>,
    ) {
        super();
        this.nodeSnapShotRepository = nodeSnapShotRepository;
        this.nodeSnapShotFactory = nodeSnapShotFactory;
        this.organizationIdStorageRepository = organizationIdStorageRepository;
        this.nodePublicKeyStorageRepository = nodePublicKeyStorageRepository;
    }

    async getLatestNodes(){
        let activeSnapShots = await this.findActiveSnapShots();
        let nodes:Node[] = activeSnapShots.map(snapShot => snapShot.toNode());

        //todo statistics
        return nodes;
    }

    async getNodesAt(crawl: CrawlV2){

    }

    async updateOrCreateSnapShots(entities: Node[], crawl: CrawlV2): Promise<NodeSnapShot[]> {
        return super.updateOrCreateSnapShots(entities, crawl) as Promise<NodeSnapShot[]>;
    }

    protected async findActiveSnapShots() {
        return await this.nodeSnapShotRepository.findActive();
    }

    protected async createSnapShot(node: Node, crawl: CrawlV2) {
        let nodePublicKeyStorage = await this.findOrCreateNodePublicKeyStorage(node.publicKey!, crawl);
        let organizationIdStorage: OrganizationIdStorage | null = null;
        if (node.organizationId)
            organizationIdStorage = await this.findOrCreateOrganizationIdStorage(node.organizationId, crawl);

        let snapShot = this.nodeSnapShotFactory.create(nodePublicKeyStorage, node, crawl, organizationIdStorage);
        await this.nodeSnapShotRepository.save(snapShot);
        return snapShot;
    }

    protected getEntityConnectedToSnapShot(snapShot: NodeSnapShot, idToEntityMap: Map<string, Node>): Node | undefined {
        return idToEntityMap.get(snapShot.nodePublicKey.publicKey);
    }

    protected getIdToEntityMap(entities: Node[]): Map<string, Node> {
        return new Map(entities
            .map(node => [node.publicKey!, node])
        );
    }

    protected getIdToSnapShotMap(snapShots: NodeSnapShot[]): Map<string, NodeSnapShot> {
        return new Map(snapShots
            .map(snapshot => [snapshot.nodePublicKey.publicKey, snapshot])
        );
    }

    protected getSnapShotConnectedToEntity(entity: Node, idToSnapShotMap: Map<string, NodeSnapShot>): NodeSnapShot | undefined {
        return idToSnapShotMap.get(entity.publicKey!);
    }

    protected hasEntityChanged(snapShot: NodeSnapShot, entity: Node): boolean {
        return snapShot.hasNodeChanged(entity);
    }

    protected async createUpdatedSnapShot(snapShot: NodeSnapShot, entity: Node, crawl: CrawlV2): Promise<NodeSnapShot> {
        if(snapShot.nodeIpPortChanged(entity) && snapShot.ipChange && !olderThanOneDay(snapShot.startCrawl.validFrom, entity.dateUpdated)){
            return snapShot; //we want to ignore constant ip changes due to badly configured nodes, so a node only gets 1 ip change a day.
        }

        snapShot.endCrawl = crawl; //todo: move to factory? inject repository in factory?
        let organizationIdStorage: OrganizationIdStorage | null;
        if (snapShot.organizationChanged(entity)) {
            if(entity.organizationId === undefined || entity.organizationId === null) {
                organizationIdStorage = null;
            } else { //careful for race conditions.
                organizationIdStorage = await this.findOrCreateOrganizationIdStorage(entity.organizationId!, crawl);
            }
        } else {
            organizationIdStorage = snapShot.organizationIdStorage;
        }

        let newSnapShot = this.nodeSnapShotFactory.createUpdatedSnapShot(snapShot, entity, crawl, organizationIdStorage);
        if(snapShot.nodeIpPortChanged(entity))
            newSnapShot.ipChange = true;

        await this.nodeSnapShotRepository.save([snapShot, newSnapShot]);
        return newSnapShot;
    }

    protected async findOrCreateNodePublicKeyStorage(publicKey: PublicKey, crawl: CrawlV2) {
        let nodePublicKeyStorage = await this.nodePublicKeyStorageRepository.findOne({
            where: {publicKey: publicKey}
        });

        if (!nodePublicKeyStorage) {
            nodePublicKeyStorage = new NodePublicKeyStorage(publicKey, crawl.validFrom);
        }

        return nodePublicKeyStorage;
    }

    protected async findOrCreateOrganizationIdStorage(organizationId: OrganizationId, crawl: CrawlV2) {
        let organizationIdStorage = await this.organizationIdStorageRepository.findOne({
            where: {organizationId: organizationId}
        });

        if (!organizationIdStorage) {
            organizationIdStorage = new OrganizationIdStorage(organizationId, crawl.validFrom);
        }

        return organizationIdStorage;
    }
}