import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";

/**
 * Stores the unique organization id's, regardless of versions.
 */
@Entity("organization_id")
export default class OrganizationIdStorage{

    @PrimaryGeneratedColumn()
    // @ts-ignore
    id: number;

    @Column("text", {nullable: false})
    @Index({unique: true})
    organizationId: string;

    constructor(organizationId: string) {
        this.organizationId = organizationId;
    }
}