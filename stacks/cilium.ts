import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";

/**
 * CiliumDeployment is a ComponentResource that installs Cilium on a Kubernetes cluster
 * and ensures it is properly running before returning.
 */
export class CiliumDeployment extends pulumi.ComponentResource {
    public readonly ciliumRelease: k8s.helm.v3.Release;
    public readonly ciliumReady: command.local.Command;
    public readonly hubbleUIReady: command.local.Command;

    constructor(name: string,
                args: {
                    k8sProvider: k8s.Provider,
                    dependsOn?: pulumi.Resource[]
                },
                opts?: pulumi.ComponentResourceOptions) {
        super("dakshsOps:infra:CiliumDeployment", name, {}, opts);

        const {k8sProvider, dependsOn} = args;

        // Install Cilium using Helm chart
        this.ciliumRelease = new k8s.helm.v3.Release(name, {
            chart: "cilium",
            version: "1.17.4",
            repositoryOpts: {
                repo: "https://helm.cilium.io/",
            },
            namespace: "kube-system",
            values: {
                // Cilium configuration for Kind
                kubeProxyReplacement: false,

                // Operator configuration (disabled to match remote)
                operator: {
                    enabled: true,
                },

                // Envoy configuration (disabled - using embedded mode)
                envoy: {
                    enabled: false,
                },

                // Hubble configuration (enabled with relay and UI)
                hubble: {
                    enabled: true,
                    relay: {
                        enabled: true,
                    },
                    ui: {
                        enabled: true,
                        replicas: 1,
                    },
                },

                // ClusterMesh configuration (disabled)
                clustermesh: {
                    useAPIServer: false,
                },

                // Other configurations
                hostServices: {
                    enabled: false,
                },
                externalIPs: {
                    enabled: true,
                },
                nodePort: {
                    enabled: true,
                },
                hostPort: {
                    enabled: true,
                },
                image: {
                    pullPolicy: "IfNotPresent",
                },
                ipam: {
                    mode: "kubernetes",
                },
            },
        }, {
            provider: k8sProvider,
            dependsOn: dependsOn,
            parent: this
        });

        // Wait for Cilium to be ready
        this.ciliumReady = new command.local.Command(`wait-for-${name}`, {
            create: "kubectl --context kind-dev wait --for=condition=ready pod -l k8s-app=cilium -n kube-system --timeout=300s",
        }, {
            dependsOn: [this.ciliumRelease],
            parent: this
        });

        // Wait for Hubble UI to be ready
        this.hubbleUIReady = new command.local.Command("wait-for-hubble-ui", {
            create: "kubectl --context kind-dev wait --for=condition=ready pod -l k8s-app=hubble-ui -n kube-system --timeout=300s",
        }, {
            dependsOn: [this.ciliumRelease],
            parent: this
        });

        this.registerOutputs({
            ciliumRelease: this.ciliumRelease,
            ciliumReady: this.ciliumReady,
            hubbleUIReady: this.hubbleUIReady
        });
    }
}
