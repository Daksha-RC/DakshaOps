import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// 1. Define the input arguments interface
export interface NginxDeploymentArgs {
    k8sProvider: k8s.Provider;
    dependsOn?: pulumi.Resource[];
}

// 2. ComponentResource class using the interface
export class NginxDeployment extends pulumi.ComponentResource {
    public readonly release: k8s.helm.v3.Release;

    constructor(name: string, args: NginxDeploymentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:infra:NginxDeployment", name, {}, opts);

        const { k8sProvider, dependsOn } = args;

        this.release = new k8s.helm.v3.Release(name, {
            chart: "ingress-nginx",
            version: "4.10.1", // Use the version as appropriate
            repositoryOpts: {
                repo: "https://kubernetes.github.io/ingress-nginx"
            },
            namespace: "ingress-nginx",
            createNamespace: true,
        }, {
            provider: k8sProvider,
            dependsOn: dependsOn,
            parent: this
        });

        this.registerOutputs({
            release: this.release,
        });
    }
}

// 3. Factory function for convenience
export function createNginxDeployment(
    name: string,
    k8sProvider: k8s.Provider,
    dependsOn?: pulumi.Resource[],
): NginxDeployment {
    return new NginxDeployment(name, { k8sProvider, dependsOn });
}