import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface EscTokenSecretArgs {
    k8sProvider: k8s.Provider;
    namespace: string;
    secretName?: string;
    dependsOn?: pulumi.Resource[];
}

/**
 * EscTokenSecret is a ComponentResource that creates a Kubernetes secret
 * containing the ESC token retrieved from Pulumi configuration.
 * 
 * This component:
 * 1. Uses pulumi.Config().requireSecret() to securely retrieve the ESC token
 * 2. Creates a Kubernetes secret in the specified namespace with the token
 * 3. Exposes the token as a Pulumi secret to prevent it from being logged
 * 
 * The token is retrieved from Pulumi configuration, ensuring that
 * sensitive data is not stored in the source code.
 */
export class EscTokenSecret extends pulumi.ComponentResource {
    public readonly secret: k8s.core.v1.Secret;
    public readonly secretName: pulumi.Output<string>;
    public readonly namespace: pulumi.Output<string>;
    public readonly token: pulumi.Output<string>;

    constructor(
        name: string,
        args: EscTokenSecretArgs,
        opts?: pulumi.ComponentResourceOptions,
    ) {
        super("dakshaOps:security:EscTokenSecret", name, {}, opts);

        // Ensure the namespace exists (or use the existing one)
        const namespace = args.namespace;
        this.namespace = pulumi.output(namespace);

        // Determine the secret name
        const secretName = args.secretName || `${name}-token`;
        
        // Get the ESC token from Pulumi configuration
        const escToken = this.getEscToken();
        
        // Create a Kubernetes Secret with the ESC token
        this.secret = new k8s.core.v1.Secret(name, {
            metadata: {
                name: secretName,
                namespace: namespace,
            },
            type: "Opaque",
            stringData: {
                // Store the token in the secret
                "escToken": escToken,
            },
        }, { 
            parent: this, 
            provider: args.k8sProvider,
            dependsOn: args.dependsOn,
        });

        // Store the secret name for later use
        this.secretName = this.secret.metadata.name;
        
        // Expose the token as a Pulumi secret
        this.token = escToken;

        this.registerOutputs({
            secret: this.secret,
            secretName: this.secretName,
            namespace: this.namespace,
            token: this.token,
        });
    }

    /**
     * Retrieves the ESC token from Pulumi configuration.
     * This uses pulumi.Config().requireSecret() to securely retrieve the token.
     */
    private getEscToken(): pulumi.Output<string> {
        try {
            // Create a config object with the "esc" namespace
            const config = new pulumi.Config("esc");
            
            // Retrieve the token as a secret
            // This will throw an error if the token is not configured
            return config.requireSecret("token");
        } catch (error) {
            console.error("Failed to retrieve ESC token from configuration:", error);
            throw error;
        }
    }
}

/**
 * Factory function to create an ESC token secret.
 * @param name Resource name
 * @param k8sProvider Kubernetes provider
 * @param namespace Namespace to create the secret in
 * @param secretName Optional name for the secret (defaults to {name}-token)
 * @param dependsOn Optional resources this depends on
 * @returns EscTokenSecret instance with the following properties:
 *   - secret: The Kubernetes Secret containing the ESC token
 *   - secretName: The name of the Kubernetes Secret
 *   - namespace: The namespace where the secret is created
 *   - token: The ESC token retrieved from Pulumi configuration (as a Pulumi secret)
 * 
 * Note: Before using this function, you must set the ESC token in your Pulumi configuration:
 * ```
 * pulumi config set --secret esc:token <your-esc-token>
 * ```
 */
export function createEscTokenSecret(
    name: string,
    k8sProvider: k8s.Provider,
    namespace: string,
    secretName?: string,
    dependsOn?: pulumi.Resource[],
): EscTokenSecret {
    return new EscTokenSecret(name, {
        k8sProvider,
        namespace,
        secretName,
        dependsOn,
    });
}