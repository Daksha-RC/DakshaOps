import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { ClusterSecretStore } from "./ClusterSecretStore";
import {SecretStore} from "./SecretStore";

// --- Pulumi ESC Configuration ---
const pulumiOrgName = "gmkumar2005"; // Your Pulumi username or organization name
const pulumiProjectName = "Daksha"; // Your Pulumi Project name
const pulumiEscEnvironment = `${pulumiOrgName}/${pulumiProjectName}/dev-daksha-cluster`; // Full path to your ESC environment

export interface CnpgSecretArgs {
    k8sProvider: k8s.Provider;
    namespace: string;
    secretName?: string;
    secretStore: SecretStore;
    dependsOn?: pulumi.Resource[];
}

/**
 * CnpgSecret is a ComponentResource that creates an ExternalSecret resource
 * using the ClusterSecretStore to fetch the db.cnpgPassword from Pulumi ESC.
 *
 * This component:
 * 1. Uses the ClusterSecretStore to connect to Pulumi ESC
 * 2. Creates an ExternalSecret resource that fetches the db.cnpgPassword
 *    from the dev-daksha-cluster environment
 * 3. Creates a Kubernetes Secret with the fetched password
 */
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

        // Use the provided namespace
        const namespace = args.namespace;
        this.namespace = pulumi.output(namespace);

        // Determine the secret name
        const secretName = args.secretName || `${name}-secret`;

        // Create the ExternalSecret custom resource
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
                    name: secretName,
                    creationPolicy: "Owner",
                },
                data: [
                    {
                        secretKey: "password",
                        remoteRef: {
                            // Using Pulumi path syntax: "db.cnpgPassword"
                            // This is equivalent to the dot notation example: "root.nested"
                            // Alternative syntaxes could be:
                            // - "db['cnpgPassword']"  (bracket notation)
                            // - "['db'].cnpgPassword" (mixed notation)
                            // - "['db']['cnpgPassword']" (full bracket notation)
                            key: "cnpgPassword",
                        },
                    },
                ],
            },
        }, {
            parent: this,
            provider: args.k8sProvider,
            dependsOn: [args.secretStore.secretStore, ...(args.dependsOn || [])],
        });

        // Store the secret name for later use
        this.secretName = pulumi.output(secretName);

        this.registerOutputs({
            externalSecret: this.externalSecret,
            secretName: this.secretName,
            namespace: this.namespace,
        });
    }
}

/**
 * Factory function to create a CnpgSecret.
 * @param name Resource name
 * @param k8sProvider Kubernetes provider
 * @param namespace Namespace where the ExternalSecret will be created
 * @param secretStore
 * @param secretName Optional name for the Secret (defaults to {name}-secret)
 * @param dependsOn Optional resources this depends on
 * @returns CnpgSecret instance with the following properties:
 *   - externalSecret: The ExternalSecret custom resource
 *   - secretName: The name of the Secret that will be created
 *   - namespace: The namespace where the ExternalSecret is created
 */
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