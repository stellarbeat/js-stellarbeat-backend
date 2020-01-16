import SnapShotterTemplate from "./SnapShotterTemplate";
import NodePublicKeyStorage, {NodePublicKeyStorageRepository} from "../../entities/NodePublicKeyStorage";
import OrganizationSnapShotRepository from "../../repositories/OrganizationSnapShotRepository";
import OrganizationIdStorage, {OrganizationIdStorageRepository} from "../../entities/OrganizationIdStorage";
import OrganizationSnapShotFactory from "../../factory/OrganizationSnapShotFactory";
import {Organization, OrganizationId, PublicKey} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "../../entities/CrawlV2";
import OrganizationSnapShot from "../../entities/OrganizationSnapShot";
import {inject, injectable} from "inversify";

@injectable()
export default class OrganizationSnapShotter extends SnapShotterTemplate {

    protected nodePublicKeyStorageRepository: NodePublicKeyStorageRepository;
    protected organizationSnapShotRepository: OrganizationSnapShotRepository;
    protected organizationIdStorageRepository: OrganizationIdStorageRepository;
    protected organizationSnapShotFactory: OrganizationSnapShotFactory;

    constructor(
        @inject('NodePublicKeyStorageRepository') nodePublicKeyStorageRepository: NodePublicKeyStorageRepository,
        organizationSnapShotRepository: OrganizationSnapShotRepository,
        @inject('OrganizationIdStorageRepository') organizationIdStorageRepository: OrganizationIdStorageRepository,
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

    async findActiveSnapShots() {
        return await this.organizationSnapShotRepository.findActive();
    }

    async findSnapShotsActiveAtTime(time: Date){
        return await this.organizationSnapShotRepository.findActiveAtTime(time);
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
        snapShot.endDate = crawl.time;
        let validators: NodePublicKeyStorage[];
        if (snapShot.validatorsChanged(entity)) {
            validators = await Promise.all(entity.validators.map(publicKey => this.findOrCreateNodePublicKeyStorage(publicKey, crawl))); //todo: could be more efficient
            //careful for race conditions.
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
            nodePublicKeyStorage = new NodePublicKeyStorage(publicKey, crawl.time);
        }

        return nodePublicKeyStorage;
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

    protected async saveSnapShot(snapShot: OrganizationSnapShot){
        return await this.organizationSnapShotRepository.save(snapShot);
    }
}