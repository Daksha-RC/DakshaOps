import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface PgClusterArgs {
    k8sProvider: k8s.Provider;
    namespace: string;
    databaseName: string;
    // externalSecretName is now MANDATORY
    externalSecretName: pulumi.Input<string>;
    dependsOn?: pulumi.Resource[];
}

export class PgCluster extends pulumi.ComponentResource {
    public readonly cluster: k8s.apiextensions.CustomResource;

    constructor(name: string, args: PgClusterArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:database:PgCluster", name, {}, opts);

        // Since externalSecretName is mandatory, we directly use it.
        const superuserSecretRef = { name: args.externalSecretName };

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
                        // Always link the provided external secret for bootstrap
                        secret: superuserSecretRef,
                    },
                },
                storage: {
                    size: "1Gi"
                },
                // Always use the provided external secret for superuser
                superuserSecret: superuserSecretRef,
                monitoring: {
                    enablePodMonitor: false
                }
            },
        }, {
            parent: this,
            provider: args.k8sProvider,
            dependsOn: [...(args.dependsOn || [])],
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
    // externalSecretName is now MANDATORY
    externalSecretName: pulumi.Input<string>,
    dependsOn?: pulumi.Resource[],
): PgCluster {
    return new PgCluster(name, {k8sProvider, namespace, databaseName, externalSecretName, dependsOn});
}