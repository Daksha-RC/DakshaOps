import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { EscTokenSecret } from "./escTokenSecret";
import {RC_APP_NAMESPACE} from "../constants";


export interface SecretStoreArgs {
    k8sProvider: k8s.Provider;
    namespace: string;
    escTokenSecret: EscTokenSecret;
    storeName?: string;
    organization?: string;
    environment?: string;
    project?: string;
    apiUrl?: string;
    esoCrdRelease?: k8s.helm.v3.Release;
    dependsOn?: pulumi.Resource[];
}

export class SecretStore extends pulumi.ComponentResource {
    public readonly secretStore: k8s.apiextensions.CustomResource;
    public readonly storeName: pulumi.Output<string>;
    public readonly namespace: pulumi.Output<string>;

    constructor(
        name: string,
        args: SecretStoreArgs,
        opts?: pulumi.ComponentResourceOptions,
    ) {
        super("dakshaOps:security:SecretStore", name, {}, opts);

        const namespace = args.namespace || RC_APP_NAMESPACE;
        this.namespace = pulumi.output(namespace);
        const storeName = args.storeName || `${name}-store`;

        const dependencies: pulumi.Resource[] = [args.escTokenSecret.secret];
        if (args.dependsOn) dependencies.push(...args.dependsOn);

        this.secretStore = new k8s.apiextensions.CustomResource(name, {
            apiVersion: "external-secrets.io/v1",
            kind: "SecretStore",
            metadata: {
                name: storeName,
                namespace: namespace,
            },
            spec: {
                provider: {
                    pulumi: {
                        organization: args.organization || "Daksha",
                        environment: args.environment,
                        project: args.project || "Daksha",
                        apiUrl: args.apiUrl || "https://api.pulumi.com",
                        accessToken: {
                            secretRef: {
                                name: args.escTokenSecret.secretName,
                                namespace: args.escTokenSecret.namespace,
                                key: "escToken",
                            },
                        },
                    },
                },
            },
        }, {
            parent: this,
            provider: args.k8sProvider,
            dependsOn: dependencies,
        });

        this.storeName = this.secretStore.metadata.name;

        this.registerOutputs({
            secretStore: this.secretStore,
            storeName: this.storeName,
            namespace: this.namespace,
        });
    }
}

export function createSecretStore(
    name: string,
    k8sProvider: k8s.Provider,
    namespace: string,
    escTokenSecret: EscTokenSecret,
    storeName?: string,
    organization?: string,
    esoCrdRelease?: k8s.helm.v3.Release,
    environment?: string,
    project?: string,
    apiUrl?: string,
    dependsOn?: pulumi.Resource[],
): SecretStore {
    return new SecretStore(name, {
        k8sProvider,
        namespace,
        escTokenSecret,
        storeName,
        organization,
        environment,
        project,
        apiUrl,
        esoCrdRelease,
        dependsOn,
    });
}