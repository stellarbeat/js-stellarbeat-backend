import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, Index, ValueTransformer} from "typeorm";
import OrganizationIdStorage from "./OrganizationIdStorage";
import NodeSnapShot from "./NodeSnapShot";
import {Organization} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "./CrawlV2";

export const organizationTransformer: ValueTransformer = {
    from: dbValue => {
        return Organization.fromJSON(dbValue);
    },
    to: entityValue => JSON.stringify(entityValue)
};

/**
 * Contains all versions of all organizations
 */
@Entity("organizationV2")
export default class OrganizationSnapShot {

    @PrimaryGeneratedColumn()
    // @ts-ignore
    id: number;

    @ManyToOne(type => CrawlV2, {nullable: false, cascade: ['insert'], eager: true})
    @Index()
    startCrawl: CrawlV2 | Promise<CrawlV2>;

    //Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
    @ManyToOne(type => CrawlV2, {nullable: true, cascade: ['insert'], eager: true})
    @Index()
    endCrawl?: CrawlV2 | null;

    @ManyToOne(type => OrganizationIdStorage, {nullable: false, eager: true})
    organizationId: OrganizationIdStorage;

    //undefined if not retrieved from database.
    @OneToMany(type => NodeSnapShot, node_snap_shot => node_snap_shot.organizationSnapShot)
    validators?: NodeSnapShot[];

    @Column("jsonb", {
        transformer: organizationTransformer
    })
    organization:Organization;

    constructor(organizationIdStorage: OrganizationIdStorage, organization:Organization, startCrawl: CrawlV2) {
        this.organizationId = organizationIdStorage;
        this.organization = organization;
        this.startCrawl = startCrawl;
    }

    organizationChanged(organization: Organization) {
        return this.organizationId.organizationId != organization.id
            || this.organization.name != organization.name
            || this.organization.dba != organization.dba
            || this.organization.url != organization.url
            || this.organization.officialEmail != organization.officialEmail
            || this.organization.phoneNumber != organization.phoneNumber
            || this.organization.physicalAddress != organization.physicalAddress
            || this.organization.twitter != organization.twitter
            || this.organization.github != organization.github
            || this.organization.description != organization.description
            || this.organization.keybase != organization.keybase
    }
}