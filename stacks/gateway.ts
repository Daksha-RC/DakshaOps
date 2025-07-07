import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface GatewayArgs {
    k8sProvider: k8s.Provider;
    dependsOn?: pulumi.Input<pulumi.Resource[]>;
}



export class GatewayComponent extends pulumi.ComponentResource {
    public readonly gateway: k8s.apiextensions.CustomResource;

    constructor(name: string, args: GatewayArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshsOps:infra:GatewayComponent", name, args, opts);

        const namespace =  "default";

        this.gateway = new k8s.apiextensions.CustomResource(
            name,
            {
                apiVersion: "gateway.networking.k8s.io/v1",
                kind: "Gateway",
                metadata: {
                    name: name,
                    namespace: namespace,
                },
                spec: {
                    gatewayClassName: "cilium",
                    listeners: [
                        {
                            name: "http",
                            protocol: "HTTP",
                            port: 80,
                            hostname: "*.nip.io",
                        },
                    ],
                },
            },
            {
                parent: this,
                provider: args.k8sProvider,
                dependsOn: args.dependsOn,
            }
        );

        this.registerOutputs({
            gateway: this.gateway,
        });
    }
}

export function createGateway(
    name: string,
    k8sProvider: k8s.Provider,
    dependsOn?: pulumi.Resource[],): GatewayComponent {
    return new GatewayComponent(name, { k8sProvider, dependsOn });
}


