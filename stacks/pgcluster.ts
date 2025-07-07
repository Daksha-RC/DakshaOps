import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// Arguments for creating a single CNPG Postgres cluster
export interface PgClusterArgs {
    k8sProvider: k8s.Provider;
    namespace: string;
    databaseName: string;
    dependsOn?: pulumi.Resource[];
}

export class PgCluster extends pulumi.ComponentResource {
    public readonly cluster: k8s.apiextensions.CustomResource;
    public readonly secretName: pulumi.Output<string>;

    constructor(name: string, args: PgClusterArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:database:PgCluster", name, {}, opts);

        // Ensure the namespace exists
        const ns = new k8s.core.v1.Namespace(args.namespace, {
            metadata: { name: args.namespace },
        }, { parent: this, provider: args.k8sProvider, dependsOn: args.dependsOn });

        // Define the CNPG "Cluster" custom resource for a single PostgreSQL instance
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
                    },
                },
                storage: {
                    size: "1Gi"
                },
                superuserSecret: {
                    name: `${name}-superuser-secret`,
                },
                monitoring: {
                    enablePodMonitor: false
                }
            },
        }, {
            parent: this,
            provider: args.k8sProvider,
            dependsOn: [ns, ...(args.dependsOn || [])],
        });

        // The CNPG cluster will create a secret named '<clusterName>-app'
        this.secretName = pulumi.output(`${name}-app`);
        // Print helpful information after Pulumi run
        this.secretName.apply(secret => {
            const ns = args.namespace;
            console.log(`\nThe secret containing database credentials is: "${secret}" (namespace: "${ns}")`);
            console.log(`kubectl get secret ${secret} -n ${ns} -o jsonpath="{.data.uri}" | base64 --decode && echo`);
            // console.log(`\nYou can extract the values using the following commands:\n`);
            //
            // console.log(`kubectl get secret ${secret} -n ${ns} -o jsonpath="{.data.username}" | base64 --decode && echo`);
            // console.log(`kubectl get secret ${secret} -n ${ns} -o jsonpath="{.data.password}" | base64 --decode && echo`);
            // console.log(`kubectl get secret ${secret} -n ${ns} -o jsonpath="{.data.dbname}" | base64 --decode && echo\n`);
        });



        this.registerOutputs({
            cluster: this.cluster,
            secretName: this.secretName

    });
    }
}

// Factory function for convenience
export function createPgCluster(
    name: string,
    k8sProvider: k8s.Provider,
    namespace: string,
    databaseName: string,
    dependsOn?: pulumi.Resource[],
): PgCluster {
    return new PgCluster(name, { k8sProvider, namespace, databaseName, dependsOn });
}