import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

/**
 * NginxDeployment is a ComponentResource that deploys an Nginx instance
 * on a Kubernetes cluster.
 */
export class NginxDeployment extends pulumi.ComponentResource {
    public readonly deployment: k8s.apps.v1.Deployment;

    constructor(name: string, 
                args: { 
                    k8sProvider: k8s.Provider,
                    dependsOn?: pulumi.Resource[]
                }, 
                opts?: pulumi.ComponentResourceOptions) {
        super("pulumi:example:NginxDeployment", name, {}, opts);

        const { k8sProvider, dependsOn } = args;

        // Deploy NGINX using the provider
        const appLabels = { app: "nginx" };
        this.deployment = new k8s.apps.v1.Deployment("nginx", {
            metadata: { labels: appLabels },
            spec: {
                selector: { matchLabels: appLabels },
                replicas: 1,
                template: {
                    metadata: { labels: appLabels },
                    spec: {
                        containers: [{
                            name: "nginx",
                            image: "nginx:latest",
                            ports: [{ containerPort: 80 }],
                        }],
                    },
                },
            },
        }, {
            provider: k8sProvider,
            dependsOn: dependsOn,
            parent: this
        });

        this.registerOutputs({
            deployment: this.deployment
        });
    }
}
