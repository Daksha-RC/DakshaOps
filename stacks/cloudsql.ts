
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

export interface CloudSqlArgs {
    project?: pulumi.Input<string>;
    region?: pulumi.Input<string>;
    dbName: pulumi.Input<string>;
    userName: pulumi.Input<string>;
    password: pulumi.Input<string>;
    diskSizeGb?: pulumi.Input<number>;
}

export class CloudSql extends pulumi.ComponentResource {
    public readonly instanceName: pulumi.Output<string>;
    public readonly databaseName: pulumi.Output<string>;
    public readonly userName: pulumi.Output<string>;
    public readonly connectionName: pulumi.Output<string>;

    constructor(name: string, args: CloudSqlArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:component:CloudSql", name, {}, opts);

        const project = args.project ?? gcp.config.project;
        const region = args.region ?? gcp.config.region;

        const instance = new gcp.sql.DatabaseInstance(`${name}-instance`, {
            project: project,
            region: region,
            databaseVersion: "POSTGRES_17",
            deletionProtection: false,
            settings: {
                tier: "db-f1-micro",
                edition: "ENTERPRISE",
                diskSize: args.diskSizeGb ?? 10,
                diskAutoresize: true,
                availabilityType: "ZONAL",
                ipConfiguration: {
                    ipv4Enabled: false,
                    privateNetwork: pulumi.interpolate`projects/${project}/global/networks/default`,
                },
                backupConfiguration: {
                    enabled: false,
                },
            },
        }, { parent: this });

        const database = new gcp.sql.Database(`${name}-db`, {
            instance: instance.name,
            name: args.dbName,
        }, { parent: this });

        const user = new gcp.sql.User(`${name}-user`, {
            instance: instance.name,
            name: args.userName,
            password: args.password,
        }, { parent: this });

        this.instanceName = instance.name;
        this.databaseName = database.name;
        this.userName = user.name;
        this.connectionName = instance.connectionName;

        this.registerOutputs({
            instanceName: this.instanceName,
            databaseName: this.databaseName,
            userName: this.userName,
            connectionName: this.connectionName,
        });
    }
}

export function createCloudSql(name: string, args: CloudSqlArgs, opts?: pulumi.ComponentResourceOptions): CloudSql {
    return new CloudSql(name, args, opts);
}
