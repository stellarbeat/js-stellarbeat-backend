import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    Index,
    JoinTable, ManyToMany
} from "typeorm";
import OrganizationIdStorage from "./OrganizationIdStorage";
import {Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "./CrawlV2";
import NodePublicKeyStorage from "./NodePublicKeyStorage";
import {SnapShot} from "./NodeSnapShot";

/**
 * Contains all versions of all organizations
 */
@Entity()
@Index(["_startCrawl", "_endCrawl"])
export default class OrganizationSnapShot implements SnapShot {

    @PrimaryGeneratedColumn()
    // @ts-ignore
    id: number;

    //undefined when not retrieved from database
    @ManyToOne(type => CrawlV2, {nullable: false, cascade: ['insert'], eager: true})
    @Index()
    protected _startCrawl?: CrawlV2;

    //Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
    @ManyToOne(type => CrawlV2, {nullable: true, cascade: ['insert'], eager: true})
    @Index()
    protected _endCrawl?: CrawlV2 | null;

    @ManyToOne(type => OrganizationIdStorage, {nullable: false, cascade: ['insert'], eager: true})
    protected _organizationIdStorage?: OrganizationIdStorage;

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

    set startCrawl(startCrawl: CrawlV2) {
        this._startCrawl = startCrawl;
    }

    get startCrawl() {
        if(this._startCrawl === undefined) {
            throw new Error('StartCrawl not loaded from database');
        }

        return this._startCrawl;
    }

    set endCrawl(endCrawl: CrawlV2 | null) {
        this._endCrawl = endCrawl;
    }

    get endCrawl() {
        if(this._endCrawl === undefined) {
            throw new Error('endCrawl not loaded from database');
        }

        return this._endCrawl;
    }

    set organizationIdStorage(organizationIdStorage: OrganizationIdStorage) {
        this._organizationIdStorage = organizationIdStorage;
    }

    get organizationIdStorage() {
        if(this._organizationIdStorage === undefined) {
            throw new Error('organizationIdStorage not loaded from database');
        }

        return this._organizationIdStorage;
    }

    organizationChanged(organization: Organization) {
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