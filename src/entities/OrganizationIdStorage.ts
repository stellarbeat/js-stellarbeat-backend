import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";

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