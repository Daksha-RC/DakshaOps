import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface PgClusterArgs {
    k8sProvider: k8s.Provider;
    namespace: string;
    databaseName: string;
    dependsOn?: pulumi.Resource[];
    externalSecretName?: pulumi.Input<string>;
}

export class PgCluster extends pulumi.ComponentResource {
    public readonly cluster: k8s.apiextensions.CustomResource;

    constructor(name: string, args: PgClusterArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:database:PgCluster", name, {}, opts);

        const ns = new k8s.core.v1.Namespace(args.namespace, {
            metadata: {name: args.namespace},
        }, {parent: this, provider: args.k8sProvider, dependsOn: args.dependsOn});

        // Use external secret if provided, else undefined (let CNPG generate)
        const superuserSecret = args.externalSecretName
            ? { name: args.externalSecretName }
            : undefined;

        this.cluster = new k8s.apiextensions.CustomResource(name, {
            apiVersion: "postgresql.cnpg.io/v1",
            kind: "Cluster",
            metadata: {
                namespace: args.namespace,
                name: name,
            },
            spec: {
                instances: 1,
                imageName: "ghcr.io/cloudnative-pg/postgresql:17.5",
                bootstrap: {
                    initdb: {
                        database: args.databaseName,
                        secret: superuserSecret,
                    },
                },
                storage: {
                    size: "1Gi"
                },
                superuserSecret,
                monitoring: {
                    enablePodMonitor: false
                }
            },
        }, {
            parent: this,
            provider: args.k8sProvider,
            dependsOn: [ns, ...(args.dependsOn || [])],
        });

        this.registerOutputs({
            cluster: this.cluster,
        });
    }
}

export function createPgCluster(
    name: string,
    k8sProvider: k8s.Provider,
    namespace: string,
    databaseName: string,
    externalSecretName?: pulumi.Input<string>,
    dependsOn?: pulumi.Resource[],
): PgCluster {
    return new PgCluster(name, {k8sProvider, namespace, databaseName, externalSecretName, dependsOn});
}