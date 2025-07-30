import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// ---------------------------------------------------------------------------
// Component 1: Database Instance
// ---------------------------------------------------------------------------

export interface DbInstanceArgs {
    project?: pulumi.Input<string>;
    region?: pulumi.Input<string>;
    diskSizeGb?: pulumi.Input<number>;
    activationPolicy?: pulumi.Input<string>;
    dependsOn?: pulumi.Resource[];
}

export class DbInstance extends pulumi.ComponentResource {
    public readonly instance: gcp.sql.DatabaseInstance;
    public readonly instanceName: pulumi.Output<string>;
    public readonly connectionName: pulumi.Output<string>;

    constructor(name: string, args: DbInstanceArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:component:DbInstance", name, {}, opts);

        const project = args.project ?? gcp.config.project;
        const region = args.region ?? gcp.config.region;

        this.instance = new gcp.sql.DatabaseInstance(`${name}-instance`, {
            project: project,
            region: region,
            databaseVersion: "POSTGRES_17",
            deletionProtection: false,
            settings: {
                tier: "db-f1-micro",
                activationPolicy: args.activationPolicy ?? "ALWAYS",
                edition: "ENTERPRISE",
                diskSize: args.diskSizeGb ?? 10,
                diskAutoresize: true,
                availabilityType: "ZONAL",
                ipConfiguration: {
                    ipv4Enabled: true,
                    privateNetwork: pulumi.interpolate`projects/${project}/global/networks/default`,
                    authorizedNetworks: [{ value: "0.0.0.0/0" }],
                },
                backupConfiguration: {
                    enabled: false,
                },
            },
        }, { parent: this, dependsOn: args.dependsOn });

        this.instanceName = this.instance.name;
        this.connectionName = this.instance.connectionName;

        this.registerOutputs({
            instance: this.instance,
            instanceName: this.instanceName,
            connectionName: this.connectionName,
        });
    }
}

/**
 * Factory function to create a Cloud SQL database instance.
 */
export function createDbInstance(name: string, args: DbInstanceArgs, opts?: pulumi.ComponentResourceOptions): DbInstance {
    return new DbInstance(name, args, opts);
}


// ---------------------------------------------------------------------------
// Component 2: Database and User
// ---------------------------------------------------------------------------

export interface DbUserAndDatabaseArgs {
    dbName: pulumi.Input<string>;
    userName: pulumi.Input<string>;
    password: pulumi.Input<string>;
    instanceName: pulumi.Input<string>; // Pass the instance name as a string
    dependsOn?: pulumi.Resource[];
}

export class DbUserAndDatabase extends pulumi.ComponentResource {
    public readonly databaseName: pulumi.Output<string>;
    public readonly userName: pulumi.Output<string>;

    constructor(name: string, args: DbUserAndDatabaseArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:component:DbUserAndDatabase", name, {}, opts);

        const database = new gcp.sql.Database(`${name}-db`, {
            instance: args.instanceName,
            name: args.dbName,
        }, { parent: this, dependsOn: args.dependsOn });

        const user = new gcp.sql.User(`${name}-user`, {
            instance: args.instanceName,
            name: args.userName,
            password: args.password,
        }, { parent: this, dependsOn: args.dependsOn });

        this.databaseName = database.name;
        this.userName = user.name;

        this.registerOutputs({
            databaseName: this.databaseName,
            userName: this.userName,
        });
    }
}

/**
 * Factory function to create a database and user for a given Cloud SQL instance.
 */
export function createDbUserAndDatabase(name: string, args: DbUserAndDatabaseArgs, opts?: pulumi.ComponentResourceOptions): DbUserAndDatabase {
    return new DbUserAndDatabase(name, args, opts);
}
