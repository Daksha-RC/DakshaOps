import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { EscTokenSecret } from "./escTokenSecret";

export interface ClusterSecretStoreArgs {
    k8sProvider: k8s.Provider;
    namespace: string;
    escTokenSecret: EscTokenSecret;
    storeName?: string;
    organization?: string;
    environment?: string;
    project?: string;
    esoCrdRelease?: k8s.helm.v3.Release;
    dependsOn?: pulumi.Resource[];
}

/**
 * ClusterSecretStore is a ComponentResource that creates a ClusterSecretStore
 * custom resource for External Secrets Operator that connects to Pulumi ESC
 * using the token defined in escTokenSecret.ts.
 * 
 * This component:
 * 1. Uses the ESC token from the provided EscTokenSecret
 * 2. Creates a ClusterSecretStore resource that can be used by ExternalSecret resources
 *    to fetch secrets from Pulumi ESC
 */
export class ClusterSecretStore extends pulumi.ComponentResource {
    public readonly secretStore: k8s.apiextensions.CustomResource;
    public readonly storeName: pulumi.Output<string>;
    public readonly namespace: pulumi.Output<string>;

    constructor(
        name: string,
        args: ClusterSecretStoreArgs,
        opts?: pulumi.ComponentResourceOptions,
    ) {
        super("dakshaOps:security:ClusterSecretStore", name, {}, opts);

        // Use the provided namespace
        const namespace = args.namespace;
        this.namespace = pulumi.output(namespace);

        // Determine the store name
        const storeName = args.storeName || `${name}-store`;

        // Create the ClusterSecretStore custom resource
        // Create a dependencies array that includes the ESO CRD release if provided
        const dependencies: pulumi.Resource[] = [args.escTokenSecret.secret];
        
        // Add the ESO CRD release to the dependencies if provided
        if (args.esoCrdRelease) {
            dependencies.push(args.esoCrdRelease);
        }
        
        // Add any additional dependencies
        if (args.dependsOn) {
            dependencies.push(...args.dependsOn);
        }

        this.secretStore = new k8s.apiextensions.CustomResource(name, {
            apiVersion: "external-secrets.io/v1",
            kind: "ClusterSecretStore",
            metadata: {
                name: storeName,
            },
            spec: {
                provider: {
                    // Configure the Pulumi ESC provider
                    pulumi: {
                        organization: args.organization || "Daksha",
                        environment: args.environment,
                        project: args.project || "Daksha",
                        // Reference the ESC token from the secret
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

        // Store the secret store name for later use
        this.storeName = this.secretStore.metadata.name;

        this.registerOutputs({
            secretStore: this.secretStore,
            storeName: this.storeName,
            namespace: this.namespace,
        });
    }
}

/**
 * Factory function to create a ClusterSecretStore.
 * @param name Resource name
 * @param k8sProvider Kubernetes provider
 * @param namespace Namespace where the ESC token secret exists
 * @param escTokenSecret The EscTokenSecret instance containing the ESC token
 * @param storeName Optional name for the ClusterSecretStore (defaults to {name}-store)
 * @param organization Optional Pulumi organization (defaults to "Daksha")
 * @param esoCrdRelease Optional Helm release that installed the ESO CRDs
 * @param environment Optional Pulumi environment
 * @param project Optional Pulumi project (defaults to "Daksha")
 * @param dependsOn Optional resources this depends on
 * @returns ClusterSecretStore instance with the following properties:
 *   - secretStore: The ClusterSecretStore custom resource
 *   - storeName: The name of the ClusterSecretStore
 *   - namespace: The namespace where the ESC token secret exists
 */
export function createClusterSecretStore(
    name: string,
    k8sProvider: k8s.Provider,
    namespace: string,
    escTokenSecret: EscTokenSecret,
    storeName?: string,
    organization?: string,
    esoCrdRelease?: k8s.helm.v3.Release,
    environment?: string,
    project?: string,
    dependsOn?: pulumi.Resource[],
): ClusterSecretStore {
    return new ClusterSecretStore(name, {
        k8sProvider,
        namespace,
        escTokenSecret,
        storeName,
        organization,
        environment,
        project,
        esoCrdRelease,
        dependsOn,
    });
}