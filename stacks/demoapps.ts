import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

// 1. Define the input arguments interface
export interface DemoAppsArgs {
    k8sProvider: k8s.Provider;
    dependsOn?: pulumi.Resource[];
}

// 2. ComponentResource for both httpbin and whoami
export class DemoApps extends pulumi.ComponentResource {
    public readonly httpbinDeployment: k8s.apps.v1.Deployment;
    public readonly httpbinService: k8s.core.v1.Service;
    public readonly whoamiDeployment: k8s.apps.v1.Deployment;
    public readonly whoamiService: k8s.core.v1.Service;

    constructor(name: string, args: DemoAppsArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshsOps:infra:DemoApps", name, {}, opts);

        const { k8sProvider, dependsOn } = args;

        // --- httpbin deployment & service ---
        this.httpbinDeployment = new k8s.apps.v1.Deployment(`${name}-httpbin`, {
            metadata: {
                namespace: "default",
                name: `${name}-httpbin`,
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: { app: `${name}-httpbin` },
                },
                template: {
                    metadata: {
                        labels: { app: `${name}-httpbin` },
                    },
                    spec: {
                        containers: [
                            {
                                name: "httpbin",
                                image: "kennethreitz/httpbin",
                                ports: [{ containerPort: 80 }],
                            },
                        ],
                    },
                },
            },
        }, {
            provider: k8sProvider,
            dependsOn,
            parent: this,
        });

        this.httpbinService = new k8s.core.v1.Service(`${name}-httpbin`, {
            metadata: {
                namespace: "default",
                name: `${name}-httpbin`,
            },
            spec: {
                selector: { app: `${name}-httpbin` },
                ports: [{ port: 80, targetPort: 80 }],
                type: "ClusterIP",
            },
        }, {
            provider: k8sProvider,
            dependsOn: [this.httpbinDeployment],
            parent: this,
        });

        // --- whoami deployment & service ---
        this.whoamiDeployment = new k8s.apps.v1.Deployment(`${name}-whoami`, {
            metadata: {
                namespace: "default",
                name: `${name}-whoami`,
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: { app: `${name}-whoami` },
                },
                template: {
                    metadata: {
                        labels: { app: `${name}-whoami` },
                    },
                    spec: {
                        containers: [
                            {
                                name: "whoami",
                                image: "traefik/whoami",
                                ports: [{ containerPort: 80 }],
                            },
                        ],
                    },
                },
            },
        }, {
            provider: k8sProvider,
            dependsOn,
            parent: this,
        });

        this.whoamiService = new k8s.core.v1.Service(`${name}-whoami`, {
            metadata: {
                namespace: "default",
                name: `${name}-whoami`,
            },
            spec: {
                selector: { app: `${name}-whoami` },
                ports: [{ port: 80, targetPort: 80 }],
                type: "ClusterIP",
            },
        }, {
            provider: k8sProvider,
            dependsOn: [this.whoamiDeployment],
            parent: this,
        });

        this.registerOutputs({
            httpbinDeployment: this.httpbinDeployment,
            httpbinService: this.httpbinService,
            whoamiDeployment: this.whoamiDeployment,
            whoamiService: this.whoamiService,
        });
    }
}

// 3. Factory function for convenience
export function createDemoApps(
    name: string,
    k8sProvider: k8s.Provider,
    dependsOn?: pulumi.Resource[],
): DemoApps {
    return new DemoApps(name, { k8sProvider, dependsOn });
}