import { AsyncLocalStorage } from "node:async_hooks";
import { DataSource, EntityManager } from "typeorm";

export class Context {

    private dataSource: DataSource;
    private readonly asyncLocalStorage = new AsyncLocalStorage<Map<string,EntityManager>>();

    public run(store: Map<string, any>, callback: () => Promise<any>) {
        return this.asyncLocalStorage.run(store, callback);
    }

    public get(key: string) {
        return this.asyncLocalStorage.getStore()?.get(key);
    }

    set(key: string, value: any) {
        const store = this.asyncLocalStorage.getStore();
        if (store) {
            store.set(key, value);
        }
    }

    public getDataSource() {
        return this.dataSource;
    }

    public async setDataSource(targetDataSource: DataSource) {     
        await targetDataSource.initialize();
        this.dataSource = targetDataSource;
    }

    hasDataSource(): boolean {
        return !(this.dataSource == null || this.dataSource == undefined);
    }

    public getEntityManager(): EntityManager {
        return this.dataSource.manager;
    }

}