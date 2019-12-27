import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    Index,
    ValueTransformer,
    JoinTable, ManyToMany
} from "typeorm";
import OrganizationIdStorage from "./OrganizationIdStorage";
import {Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "./CrawlV2";
import NodePublicKeyStorage from "./NodePublicKeyStorage";

export const organizationTransformer: ValueTransformer = {
    from: dbValue => {
        return Organization.fromJSON(dbValue);
    },
    to: entityValue => JSON.stringify(entityValue)
};

/**
 * Contains all versions of all organizations
 */
@Entity()
export default class OrganizationSnapShot {

    @PrimaryGeneratedColumn()
    // @ts-ignore
    id: number;

    //undefined when not retrieved from databse
    @ManyToOne(type => CrawlV2, {nullable: false, cascade: ['insert'], eager: true})
    @Index()
    startCrawl?: CrawlV2 | Promise<CrawlV2>;

    //Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
    @ManyToOne(type => CrawlV2, {nullable: true, cascade: ['insert'], eager: true})
    @Index()
    endCrawl?: CrawlV2 | null;

    @ManyToOne(type => OrganizationIdStorage, {nullable: false, cascade: ['insert'], eager: true})
    organizationIdStorage: OrganizationIdStorage;

    //undefined if not retrieved from database.
    @ManyToMany(type => NodePublicKeyStorage, {nullable: false, cascade: ['insert'], eager: true})
    @JoinTable({name: 'organization_snap_shot_validators_node_public_key'})
    protected _validators?: NodePublicKeyStorage[];

    @Column('text', {nullable: true})
    name: string|null = null;

    @Column('text', {nullable: true})
    dba: string|null = null;

    @Column('text', {nullable: true})
    url: string|null = null;

    @Column('text', {nullable: true})
    officialEmail: string|null = null;

    @Column('text', {nullable: true})
    phoneNumber: string|null = null;

    @Column('text', {nullable: true})
    physicalAddress: string|null = null;

    @Column('text', {nullable: true})
    twitter: string|null = null;

    @Column('text', {nullable: true})
    github: string|null = null;

    @Column('text', {nullable: true})
    description: string|null = null;

    @Column('text', {nullable: true})
    keybase: string|null = null;

    constructor(organizationIdStorage: OrganizationIdStorage, startCrawl: CrawlV2) {
        this.organizationIdStorage = organizationIdStorage;
        this.startCrawl = startCrawl;
    }

    set validators(validators: NodePublicKeyStorage[]) {
        this._validators = validators;
    }
    get validators() {
        if(this._validators === undefined) {
            throw new Error('Validators not loaded from database');
        }

        return this._validators;
    }

    organizationChanged(organization: Organization) {
        if(this.organizationIdStorage === undefined) {
            throw new Error('OrganizationIdStorage not loaded from database');
        }

        return this.organizationIdStorage.organizationId != organization.id
            || this.name != organization.name
            || this.dba != organization.dba
            || this.url != organization.url
            || this.officialEmail != organization.officialEmail
            || this.phoneNumber != organization.phoneNumber
            || this.physicalAddress != organization.physicalAddress
            || this.twitter != organization.twitter
            || this.github != organization.github
            || this.description != organization.description
            || this.keybase != organization.keybase
            || this.validatorsChanged(organization)
    }

    validatorsChanged(organization: Organization) {
        let validatorPublicKeys = this.validators.map(validator => validator.publicKey);

        if(validatorPublicKeys.length !== organization.validators.length)
            return true;
        if(!validatorPublicKeys.every(publicKey => organization.validators.includes(publicKey)))
            return true;

        return !validatorPublicKeys.every(publicKey => organization.validators.includes(publicKey));
    }
}