import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";

// 1. Define the input arguments interface
export interface CiliumDeploymentArgs {
    k8sProvider: k8s.Provider;
    dependsOn?: pulumi.Resource[];
}

// 2. ComponentResource class using the interface
export class CiliumDeployment extends pulumi.ComponentResource {
    public readonly ciliumRelease: k8s.helm.v3.Release;
    public readonly ciliumReady: command.local.Command;
    public readonly hubbleUIReady: command.local.Command;

    constructor(name: string, args: CiliumDeploymentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshsOps:infra:CiliumDeployment", name, {}, opts);

        const { k8sProvider, dependsOn } = args;

        this.ciliumRelease = new k8s.helm.v3.Release(name, {
            chart: "cilium",
            version: "1.17.4",
            repositoryOpts: {
                repo: "https://helm.cilium.io/",
            },
            namespace: "kube-system",
            values: {
                kubeProxyReplacement: true,
                loadBalancer: {
                    mode: "snat",
                },
                l7Proxy: true,
                hostNetwork:true,
                operator: { enabled: true },
                envoy: { enabled: false },
                hubble: {
                    enabled: true,
                    relay: { enabled: true },
                    ui: { enabled: true, replicas: 1 },
                },
                clustermesh: { useAPIServer: false },
                hostServices: { enabled: false },
                externalIPs: { enabled: true },
                nodePort: { enabled: true },
                hostPort: { enabled: true },
                image: { pullPolicy: "IfNotPresent" },
                ipam: { mode: "kubernetes" },
                gatewayAPI: { enabled: true },

            },
        }, {
            provider: k8sProvider,
            dependsOn: dependsOn,
            parent: this
        });

        this.ciliumReady = new command.local.Command(`wait-for-${name}`, {
            create: "kubectl --context kind-dev wait --for=condition=ready pod -l k8s-app=cilium -n kube-system --timeout=300s",
        }, {
            dependsOn: [this.ciliumRelease],
            parent: this
        });

        this.hubbleUIReady = new command.local.Command("wait-for-hubble-ui", {
            create: "kubectl --context kind-dev wait --for=condition=ready pod -l k8s-app=hubble-ui -n kube-system --timeout=300s",
        }, {
            dependsOn: [this.ciliumRelease],
            parent: this
        });

        this.registerOutputs({
            ciliumRelease: this.ciliumRelease,
            ciliumReady: this.ciliumReady,
            hubbleUIReady: this.hubbleUIReady,
        });
    }
}

// 3. Factory function for convenience
export function createCiliumDeployment(
    name: string,
    k8sProvider: k8s.Provider,
    dependsOn?: pulumi.Resource[],
): CiliumDeployment {
    return new CiliumDeployment(name, { k8sProvider, dependsOn });
}