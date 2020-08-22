import Kernel from "../Kernel";
import {CrawlV2Repository} from "../repositories/CrawlV2Repository";

// noinspection JSIgnoredPromiseFromCall
main();

async function main() {
    let kernel = new Kernel();
    await kernel.initializeContainer();
    let crawl = await getCrawl(kernel, 1);//todo fetch from rollup
    console.log(crawl);
}

async function getCrawl(kernel:Kernel, id:number) {
    let crawlRepo = kernel.container.get(CrawlV2Repository);
    return await crawlRepo.findOne(id);
}