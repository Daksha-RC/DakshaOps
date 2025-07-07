import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface HttpRouteArgs {
    backendSvcName: pulumi.Input<string>;
    k8sProvider: k8s.Provider;
    gatewayName: pulumi.Input<string>;
    namespace?: pulumi.Input<string>;
    dependsOn?: pulumi.Input<pulumi.Resource[]>;
}

export class HttpRouteComponent extends pulumi.ComponentResource {
    public readonly httpRoute: k8s.apiextensions.CustomResource;

    constructor(
        name: string,
        args: HttpRouteArgs,
        opts?: pulumi.ComponentResourceOptions
    ) {
        super("dakshsOps:infra:HttpRouteComponent", name, args, opts);

        const namespace = args.namespace || "default";

        this.httpRoute = new k8s.apiextensions.CustomResource(
            name,
            {
                apiVersion: "gateway.networking.k8s.io/v1beta1",
                kind: "HTTPRoute",
                metadata: {
                    name: name,
                    namespace: namespace,
                },
                spec: {
                    parentRefs: [
                        {
                            name: args.gatewayName,
                            namespace: namespace,
                        },
                    ],
                    hostnames: ["httpbin.127.0.0.1.nip.io"],
                    rules: [
                        {
                            matches: [
                                {
                                    path: {
                                        type: "PathPrefix",
                                        value: "/",
                                    },
                                },
                            ],
                            backendRefs: [
                                {
                                    name: args.backendSvcName,
                                    port: 80,
                                },
                            ],
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
            httpRoute: this.httpRoute,
        });
    }
}

export function createHttpRoute(
    name: string,
    backendSvcName: pulumi.Input<string>,
    k8sProvider: k8s.Provider,
    gatewayName: pulumi.Input<string>,
    dependsOn?: pulumi.Resource[]
): HttpRouteComponent {
    return new HttpRouteComponent(name,{
        backendSvcName,
        k8sProvider,
        gatewayName,
        dependsOn
    });
}


//export function createGateway(
//     name: string,
//     k8sProvider: k8s.Provider,
//     dependsOn?: pulumi.Resource[],): GatewayComponent {
//     return new GatewayComponent(name, { k8sProvider, dependsOn });
// }