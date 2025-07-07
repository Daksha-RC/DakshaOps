import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as command from "@pulumi/command";
import {CustomResource} from "@pulumi/pulumi";

// 1. Define the input arguments interface
export interface GatewayCrdArgs {
    k8sProvider: k8s.Provider;
    dependsOn?: pulumi.Resource[];
}

const config = new pulumi.Config("cluster");
const kubeContext = config.require("kubeContext");


// 2. ComponentResource for Gateway CRDs
export class GatewayCrd extends pulumi.ComponentResource {
    public readonly crds: command.local.Command;
    public readonly crdReady: command.local.Command;
    public gatewayClass: CustomResource;

    constructor(name: string, args: GatewayCrdArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshsOps:infra:GatewayCrd", name, {}, opts);

        const {k8sProvider, dependsOn} = args;

        // Official manifests for Kubernetes Gateway CRDs
        const gatewayCrdUrl = "./stacks/standard-install.yaml";

        // this.crds = new k8s.yaml.ConfigFile(`${name}-gateway-crds`, {
        //     file: gatewayCrdUrl,
        // }, {
        //     provider: k8sProvider,
        //     dependsOn: dependsOn,
        //     parent: this,
        // });

        this.crds = new command.local.Command("apply-gateway-crds", {
            create: `kubectl --context ${kubeContext} apply -f ./stacks/standard-install.yaml`,
        }, {
            dependsOn: dependsOn,
            parent: this,
        });

        // Wait for the CRDs to be established and ready in the cluster
        // We'll check for one key CRD, e.g. gateways.gateway.networking.k8s.io
        this.crdReady =
            new command.local.Command(`${name}-wait-gateway-crd`, {
                create: `kubectl --context ${kubeContext} wait --for=condition=established crd/gateways.gateway.networking.k8s.io --timeout=120s`,
            }, {
                dependsOn: [this.crds, ...(args.dependsOn || [])],
                parent: this,
            });

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
            provider: k8sProvider,
            dependsOn: dependsOn,
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
    dependsOn?: pulumi.Resource[],
): GatewayCrd {
    return new GatewayCrd(name, {k8sProvider, dependsOn});
}

