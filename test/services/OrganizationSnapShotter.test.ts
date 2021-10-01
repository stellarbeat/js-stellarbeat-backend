import "reflect-metadata"; //todo: create container without loading the database
import OrganizationSnapShotter from "../../src/services/SnapShotting/OrganizationSnapShotter";
import OrganizationSnapShotRepository from "../../src/repositories/OrganizationSnapShotRepository";
import OrganizationIdStorage from "../../src/entities/OrganizationIdStorage";
import OrganizationSnapShot from "../../src/entities/OrganizationSnapShot";
const organizationSnapShotRepository = new OrganizationSnapShotRepository();

describe("findLatestSnapShots", () => {
    test("unknownIdShouldReturnEmptyResult", async () => {
        const organizationIdStorageRepository = {findOne: () => undefined};
        const organizationSnapShotter = new OrganizationSnapShotter({} as any, organizationSnapShotRepository as any, organizationIdStorageRepository as any, {} as any);
        const snapShots = await organizationSnapShotter.findLatestSnapShotsByOrganization('a', new Date());
        expect(snapShots.length).toEqual(0);
    });

    test("itShouldReturnSnapShots", async () => {
        const organizationIdStorage = new OrganizationIdStorage('a', new Date());
        const organizationIdStorageRepository = {findOne: () => organizationIdStorage};
        const organizationSnapShotter = new OrganizationSnapShotter({} as any, organizationSnapShotRepository, organizationIdStorageRepository as any, {} as any);
        const date = new Date();
        const snapShot = new OrganizationSnapShot(organizationIdStorage, date);
        jest.spyOn(organizationSnapShotRepository, 'findLatestByOrganization').mockResolvedValue([snapShot]);
        const snapShots = await organizationSnapShotter.findLatestSnapShotsByOrganization('a', new Date());
        expect(snapShots.length).toEqual(1);
    });
});