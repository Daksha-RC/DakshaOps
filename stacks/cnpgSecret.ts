import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {SecretStore} from "./SecretStore";

export interface CnpgSecretArgs {
    k8sProvider: k8s.Provider;
    namespace: string;
    secretName?: string;
    secretStore: SecretStore;
    dependsOn?: pulumi.Resource[];
}

export class CnpgSecret extends pulumi.ComponentResource {
    public readonly externalSecret: k8s.apiextensions.CustomResource;
    public readonly secretName: pulumi.Output<string>;
    public readonly namespace: pulumi.Output<string>;

    constructor(
        name: string,
        args: CnpgSecretArgs,
        opts?: pulumi.ComponentResourceOptions,
    ) {
        super("dakshaOps:security:CnpgSecret", name, {}, opts);

        const namespace = args.namespace;
        this.namespace = pulumi.output(namespace);
        const secretName = args.secretName || `${name}-secret`;

        this.externalSecret = new k8s.apiextensions.CustomResource(name, {
            apiVersion: "external-secrets.io/v1",
            kind: "ExternalSecret",
            metadata: {
                name: name,
                namespace: namespace,
            },
            spec: {
                refreshInterval: "1h",
                secretStoreRef: {
                    name: args.secretStore.storeName,
                    kind: "ClusterSecretStore",
                },
                target: {
                    name: name,
                    creationPolicy: "Owner",
                    deletionPolicy: "Retain",
                    template: {
                        engineVersion: "v2",
                        metadata: {
                            labels: {
                                "cnpg.io/reload": "true",
                            },
                        },
                        data: {
                            DATABASE_URL: `postgres://{{ .databaseUserName }}:{{ .cnpgPassword }}@{{ .databaseHost }}:{{ .databasePort }}/{{ .databaseName }}`,
                            // NEW: Expose DB_USER_NAME
                            username: `{{ .databaseUserName }}`,
                            // NEW: Expose CNPG_PASSWORD
                            password: `{{ .cnpgPassword }}`,
                            DATABASE_HOST: `{{ .databaseHost }}`,
                            DATABASE_PORT: `{{ .databasePort }}`,
                            DATABASE_NAME: `{{ .databaseName }}`,
                        },
                    },
                },
                dataFrom: [
                    {
                        extract: {
                            key: "db",
                        },
                    },
                ],
            },
        }, {
            parent: this,
            provider: args.k8sProvider,
            dependsOn: [args.secretStore.secretStore, ...(args.dependsOn || [])],
        });

        this.secretName = pulumi.output(secretName);

        this.registerOutputs({
            externalSecret: this.externalSecret,
            secretName: this.secretName,
            namespace: this.namespace,
        });
    }
}

export function createCnpgSecret(
    name: string,
    k8sProvider: k8s.Provider,
    namespace: string,
    secretStore: SecretStore,
    secretName?: string,
    dependsOn?: pulumi.Resource[],
): CnpgSecret {
    return new CnpgSecret(name, {
        k8sProvider,
        namespace,
        secretStore,
        secretName,
        dependsOn,
    });
}