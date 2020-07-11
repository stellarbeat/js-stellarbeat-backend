import SnapShotterTemplate from "./SnapShotterTemplate";
import NodeSnapShotRepository from "../../repositories/NodeSnapShotRepository";
import NodeSnapShotFactory from "../../factory/NodeSnapShotFactory";
import NodePublicKeyStorage, {NodePublicKeyStorageRepository} from "../../entities/NodePublicKeyStorage";
import OrganizationIdStorage, {OrganizationIdStorageRepository} from "../../entities/OrganizationIdStorage";
import CrawlV2 from "../../entities/CrawlV2";
import {Node, OrganizationId, PublicKey} from "@stellarbeat/js-stellar-domain";
import NodeSnapShot from "../../entities/NodeSnapShot";
import olderThanOneDay from "../../filters/OlderThanOneDay";
import {inject, injectable} from "inversify";

@injectable()
export default class NodeSnapShotter extends SnapShotterTemplate {

    protected nodeSnapShotRepository: NodeSnapShotRepository;
    protected nodeSnapShotFactory: NodeSnapShotFactory;
    protected nodePublicKeyStorageRepository: NodePublicKeyStorageRepository;
    protected organizationIdStorageRepository: OrganizationIdStorageRepository;

    constructor(
        nodeSnapShotRepository: NodeSnapShotRepository,
        nodeSnapShotFactory: NodeSnapShotFactory,
        @inject('NodePublicKeyStorageRepository') nodePublicKeyStorageRepository: NodePublicKeyStorageRepository,
        @inject('OrganizationIdStorageRepository') organizationIdStorageRepository: OrganizationIdStorageRepository,
    ) {
        super();
        this.nodeSnapShotRepository = nodeSnapShotRepository;
        this.nodeSnapShotFactory = nodeSnapShotFactory;
        this.organizationIdStorageRepository = organizationIdStorageRepository;
        this.nodePublicKeyStorageRepository = nodePublicKeyStorageRepository;
    }

    updateOrCreateSnapShots(entities: Node[], crawl: CrawlV2): Promise<NodeSnapShot[]> {
        return super.updateOrCreateSnapShots(entities, crawl) as Promise<NodeSnapShot[]>;
    }

    async findActiveSnapShots() {
        return await this.nodeSnapShotRepository.findActive();
    }

    async findSnapShotsActiveAtTime(time: Date){
        return await this.nodeSnapShotRepository.findActiveAtTime(time);
    }

    async findLatestSnapShots(publicKey: string){
        let nodePublicKeyStorage = await this.findNodePublicKeyStorage(publicKey);
        if(!nodePublicKeyStorage)
            return [];

        let snapShots = await this.nodeSnapShotRepository.findLatestSnapShots(nodePublicKeyStorage);

        return snapShots;
    }

    protected async createSnapShot(node: Node, crawl: CrawlV2) {
        let nodePublicKeyStorage = await this.findNodePublicKeyStorage(node.publicKey!);
        if(nodePublicKeyStorage && await this.isNodeMisbehaving(nodePublicKeyStorage, crawl)) {
            node.active = false; //disable node
            node.isValidating = false;
            node.isFullValidator = false;
            return undefined;
        }


        if(!nodePublicKeyStorage)
            nodePublicKeyStorage = new NodePublicKeyStorage(node.publicKey!, crawl.time);

        let organizationIdStorage: OrganizationIdStorage | null = null;
        if (node.organizationId)
            organizationIdStorage = await this.findOrCreateOrganizationIdStorage(node.organizationId, crawl);

        let snapShot = this.nodeSnapShotFactory.create(nodePublicKeyStorage, node, crawl.time, organizationIdStorage);
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
        if(snapShot.nodeIpPortChanged(entity) && snapShot.ipChange && !olderThanOneDay(snapShot.startDate, crawl.time)){
            return snapShot; //we want to ignore constant ip changes due to badly configured nodes, so a node only gets 1 ip change a day.
        }

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

        let newSnapShot = this.nodeSnapShotFactory.createUpdatedSnapShot(snapShot, entity, crawl.time, organizationIdStorage);
        if(snapShot.nodeIpPortChanged(entity))
            newSnapShot.ipChange = true;

        await this.nodeSnapShotRepository.save([snapShot, newSnapShot]);
        return newSnapShot;
    }

    protected async findNodePublicKeyStorage(publicKey: PublicKey) {
        return await this.nodePublicKeyStorageRepository.findOne({
            where: {publicKey: publicKey}
        });
    }

    protected async isNodeMisbehaving(nodePublicKeyStorage: NodePublicKeyStorage, crawl: CrawlV2) {
        let latestChangeDate = await this.nodeSnapShotRepository.findLatestChangeDate(nodePublicKeyStorage);

        if(!latestChangeDate || !latestChangeDate.latestChangeDate)
            return false;

        if(latestChangeDate.latestChangeDate.getTime() === NodeSnapShot.MAX_DATE.getTime()) {
            return false; //this node is active.
        }
        if(!olderThanOneDay(latestChangeDate.latestChangeDate, crawl.time)){
            //todo: store in database for easier debugging.
            console.log("Node is switching between public keys on the same ip address on regular basis, probably badly configured: " + nodePublicKeyStorage.publicKey);
            return true;//only one public key change per day allowed to stop badly configured nodes filling up the database
        }

        return false;
    }

    protected async findOrCreateOrganizationIdStorage(organizationId: OrganizationId, crawl: CrawlV2) {
        let organizationIdStorage = await this.organizationIdStorageRepository.findOne({
            where: {organizationId: organizationId}
        });

        if (!organizationIdStorage) {
            organizationIdStorage = new OrganizationIdStorage(organizationId, crawl.time);
        }

        return organizationIdStorage;
    }

    protected async saveSnapShot(snapShot: NodeSnapShot){
        return await this.nodeSnapShotRepository.save(snapShot);
    }
}