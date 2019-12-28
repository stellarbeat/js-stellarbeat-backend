import SnapShotterTemplate from "./SnapShotterTemplate";
import NodePublicKeyStorage from "../../entities/NodePublicKeyStorage";
import OrganizationSnapShotRepository from "../../repositories/OrganizationSnapShotRepository";
import OrganizationIdStorage from "../../entities/OrganizationIdStorage";
import OrganizationSnapShotFactory from "../../factory/OrganizationSnapShotFactory";
import {Repository} from "typeorm";
import {Organization, OrganizationId, PublicKey} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../../entities/CrawlV2";
import OrganizationSnapShot from "../../entities/OrganizationSnapShot";

export default class OrganizationSnapShotter extends SnapShotterTemplate {

    protected nodePublicKeyStorageRepository: Repository<NodePublicKeyStorage>;
    protected organizationSnapShotRepository: OrganizationSnapShotRepository;
    protected organizationIdStorageRepository: Repository<OrganizationIdStorage>;
    protected organizationSnapShotFactory: OrganizationSnapShotFactory;

    constructor(
        nodePublicKeyStorageRepository: Repository<NodePublicKeyStorage>,
        organizationSnapShotRepository: OrganizationSnapShotRepository,
        organizationIdStorageRepository: Repository<OrganizationIdStorage>,
        organizationSnapShotFactory: OrganizationSnapShotFactory
    ) {
        super();
        this.organizationSnapShotRepository = organizationSnapShotRepository;
        this.organizationIdStorageRepository = organizationIdStorageRepository;
        this.organizationSnapShotFactory = organizationSnapShotFactory;
        this.nodePublicKeyStorageRepository = nodePublicKeyStorageRepository;
    }

    async updateOrCreateSnapShots(entities: Organization[], crawl: CrawlV2): Promise<OrganizationSnapShot[]> {
        return super.updateOrCreateSnapShots(entities, crawl) as Promise<OrganizationSnapShot[]>;
    }

    protected async findActiveSnapShots() {
        return await this.organizationSnapShotRepository.findActive();
    }

    protected async createSnapShot(organization: Organization, crawl: CrawlV2) {
        let organizationIdStorage = await this.findOrCreateOrganizationIdStorage(organization.id, crawl);
        let validators = await Promise.all(organization.validators.map(publicKey => this.findOrCreateNodePublicKeyStorage(publicKey, crawl)));
        let newOrganizationSnapShot = this.organizationSnapShotFactory.create(organizationIdStorage, organization, crawl, validators);
        return await this.organizationSnapShotRepository.save(newOrganizationSnapShot);
    }

    protected getEntityConnectedToSnapShot(snapShot: OrganizationSnapShot, idToEntityMap: Map<string, Organization>): Organization | undefined {
        return idToEntityMap.get(snapShot.organizationIdStorage.organizationId);
    }

    protected getIdToEntityMap(entities: Organization[]): Map<string, Organization> {
        return new Map(entities
            .map(org => [org.id, org])
        );
    }

    protected getIdToSnapShotMap(snapShots: OrganizationSnapShot[]): Map<string, OrganizationSnapShot> {
        return new Map(snapShots
            .map(snapshot => [snapshot.organizationIdStorage.organizationId, snapshot])
        );
    }

    protected getSnapShotConnectedToEntity(entity: Organization, idToSnapShotMap: Map<string, OrganizationSnapShot>): OrganizationSnapShot | undefined {
        return idToSnapShotMap.get(entity.id);
    }

    protected hasEntityChanged(snapShot: OrganizationSnapShot, entity: Organization): boolean {
        return snapShot.organizationChanged(entity);
    }

    protected async createUpdatedSnapShot(snapShot: OrganizationSnapShot, entity: Organization, crawl: CrawlV2): Promise<OrganizationSnapShot> {
        snapShot.endCrawl = crawl;
        let validators: NodePublicKeyStorage[];
        if (snapShot.validatorsChanged(entity)) {
            validators = await Promise.all(entity.validators.map(publicKey => this.findOrCreateNodePublicKeyStorage(publicKey, crawl))); //todo: could be more efficient
        } else {
            validators = snapShot.validators;
        }
        let newSnapShot = this.organizationSnapShotFactory.createUpdatedSnapShot(snapShot, entity, crawl, validators);
        await this.organizationSnapShotRepository.save([snapShot, newSnapShot]);

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