import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface EsoCrdArgs {
    k8sProvider: k8s.Provider;
    dependsOn?: pulumi.Resource[];
}

export class EsoCrd extends pulumi.ComponentResource {
    public readonly release: k8s.helm.v3.Release;

    constructor(name: string, args: EsoCrdArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:security:ExternalSecrets", name, {}, opts);

        // Ensure the namespace exists
        const ns = new k8s.core.v1.Namespace(name, {
            metadata: { name: name },
        }, { parent: this, provider: args.k8sProvider, dependsOn: args.dependsOn });

        // Install the External Secrets Operator via Helm
        this.release = new k8s.helm.v3.Release(name, {
            chart: "external-secrets",
            version: "0.18.2", // Update as needed
            repositoryOpts: {
                repo: "https://charts.external-secrets.io",
            },
            namespace: name,
            createNamespace: false,
        }, {
            parent: this,
            provider: args.k8sProvider,
            dependsOn: [ns, ...(args.dependsOn || [])],
        });

        this.registerOutputs({
            release: this.release,
        });
    }
}

// Factory function for convenience
export function createEsoCrd(
    name: string,
    k8sProvider: k8s.Provider,
    dependsOn?: pulumi.Resource[],
): EsoCrd {
    return new EsoCrd(name, { k8sProvider, dependsOn });
}