import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface CnpgCrdArgs {
    k8sProvider: k8s.Provider;
    dependsOn?: pulumi.Resource[];
}

export class CnpgCrd extends pulumi.ComponentResource {
    public readonly release: k8s.helm.v3.Release;

    constructor(name: string, args: CnpgCrdArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:database:CloudNativePG", name, {}, opts);

        // Ensure the namespace exists
        const ns = new k8s.core.v1.Namespace(name, {
            metadata: { name: name },
        }, { parent: this, provider: args.k8sProvider, dependsOn: args.dependsOn });

        // Install the CNPG operator via Helm
        this.release = new k8s.helm.v3.Release(name, {
            chart: "cloudnative-pg",
            version: "0.24.0", // Update as needed
            repositoryOpts: {
                repo: "https://cloudnative-pg.github.io/charts/",
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
export function createCnpgCrd(
    name: string,
    k8sProvider: k8s.Provider,
    dependsOn?: pulumi.Resource[],
): CnpgCrd {
    return new CnpgCrd(name, { k8sProvider, dependsOn });
}