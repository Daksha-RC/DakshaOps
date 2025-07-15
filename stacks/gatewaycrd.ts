import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as command from "@pulumi/command";
import {CustomResource} from "@pulumi/pulumi";

// 1. Define the input arguments interface
export interface GatewayCrdArgs {
    k8sProvider: k8s.Provider;
    kubeconfig: pulumi.Output<string>; // Add kubeconfig secret
    dependsOn?: pulumi.Resource[];
}

// 2. ComponentResource for Gateway CRDs
export class GatewayCrd extends pulumi.ComponentResource {
    public readonly crds: command.local.Command;
    public readonly crdReady: command.local.Command;
    public gatewayClass: CustomResource;

    constructor(name: string, args: GatewayCrdArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshsOps:infra:GatewayCrd", name, {}, opts);

        const {k8sProvider, kubeconfig, dependsOn} = args;

        // Command to apply the Gateway CRDs using the provided kubeconfig
        this.crds = new command.local.Command("apply-gateway-crds", {
            create: kubeconfig.apply(kc => `
                set -e
                TMP_KUBECONFIG=$(mktemp)
                trap 'rm -f "$TMP_KUBECONFIG"' EXIT
                printf "%s" '${kc}' > "$TMP_KUBECONFIG"
                KUBECONFIG="$TMP_KUBECONFIG" kubectl apply -f ./stacks/standard-install.yaml
            `),
            delete: kubeconfig.apply(kc => `
                set -e
                TMP_KUBECONFIG=$(mktemp)
                trap 'rm -f "$TMP_KUBECONFIG"' EXIT
                printf "%s" '${kc}' > "$TMP_KUBECONFIG"
                KUBECONFIG="$TMP_KUBECONFIG" kubectl delete -f ./stacks/standard-install.yaml --ignore-not-found=true
            `),
        }, {
            dependsOn: dependsOn,
            parent: this,
        });

        // Command to wait for the CRDs to be established in the cluster
        this.crdReady = new command.local.Command(`${name}-wait-gateway-crd`, {
            create: kubeconfig.apply(kc => `
                set -e
                TMP_KUBECONFIG=$(mktemp)
                trap 'rm -f "$TMP_KUBECONFIG"' EXIT
                printf "%s" '${kc}' > "$TMP_KUBECONFIG"
                KUBECONFIG="$TMP_KUBECONFIG" kubectl wait --for=condition=established crd/gateways.gateway.networking.k8s.io --timeout=120s
            `),
        }, {
            dependsOn: [this.crds, ...(dependsOn || [])],
            parent: this,
        });

        // The GatewayClass is still managed by Pulumi's Kubernetes provider
        this.gatewayClass = new k8s.apiextensions.CustomResource("cilium-gatewayclass", {
            apiVersion: "gateway.networking.k8s.io/v1",
            kind: "GatewayClass",
            metadata: {
                name: "cilium",
            },
            spec: {
                controllerName: "io.cilium/gateway-controller",
            },
        }, {
            provider: k8sProvider, // Using the provider here
            dependsOn: [this.crdReady], // Depends on the CRDs being ready
            parent: this,
        });

        this.registerOutputs({
            crds: this.crds,
            crdReady: this.crdReady,
            gatewayClass: this.gatewayClass,
        });
    }
}

// 3. Factory function for convenience
export function createGatewayCrd(
    name: string,
    k8sProvider: k8s.Provider,
    kubeconfig: pulumi.Output<string>, // Add kubeconfig parameter
    dependsOn?: pulumi.Resource[],
): GatewayCrd {
    return new GatewayCrd(name, {k8sProvider, kubeconfig, dependsOn});
}