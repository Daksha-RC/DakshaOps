import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface RcAppArgs {
    k8sProvider: k8s.Provider;
    namespace: string;
    releaseName: string;
    dbcred: pulumi.Input<string>; // new parameter for secret
    values?: Record<string, any>;
    dependsOn?: pulumi.Resource[];
}

export class RcApp extends pulumi.ComponentResource {
    public readonly release: k8s.helm.v3.Release;


    constructor(name: string, args: RcAppArgs,opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:app:RcApp", name, {}, opts);

        // Ensure the namespace exists
        const ns = new k8s.core.v1.Namespace(args.namespace, {
            metadata: {name: args.namespace},
        }, {parent: this, provider: args.k8sProvider, dependsOn: args.dependsOn});

        // Install the rc-app Helm chart from the local folder
        this.release = new k8s.helm.v3.Release(args.releaseName, {
            chart: "./rc-app",
            namespace: args.namespace,
            createNamespace: false,
            values: args.values || {
                image: {
                    repository: "ghcr.io/daksha-rc/rc-web",
                    tag: "v0.1.3",
                },
                replicaCount: 1,
                databaseurl: args.dbcred,
            },
            version: "0.1.0", // Update this if your Chart.yaml appVersion is different
            atomic: true,
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
export function createRcApp(
    name: string,
    k8sProvider: k8s.Provider,
    namespace: string,
    releaseName: string,
    dbcred: pulumi.Input<string>,
    values?: Record<string, any>,
    dependsOn?: pulumi.Resource[],
): RcApp {
    return new RcApp(name, {k8sProvider, namespace, releaseName, dbcred, values, dependsOn});
}