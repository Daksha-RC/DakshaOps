import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
import * as k8s from "@pulumi/kubernetes";

/**
 * DOK8sCluster is a ComponentResource that manages a DigitalOcean Kubernetes cluster and Kubernetes provider.
 */
export class DOK8sCluster extends pulumi.ComponentResource {
    public readonly k8sProvider: k8s.Provider;
    public readonly cluster: digitalocean.KubernetesCluster;

    constructor(name: string, args: {
        clusterName: string;
        nodePoolName: string;
        nodeSize: string;
        region?: digitalocean.Region;
        version?: string;
        nodeCount?: number;
    }, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:cluster:DOK8sCluster", name, {}, opts);

        // Create the DigitalOcean Kubernetes cluster
        this.cluster = new digitalocean.KubernetesCluster(args.clusterName, {
            name: args.clusterName,
            region: args.region || digitalocean.Region.BLR1,
            version: args.version || "1.33.1-do.1",
            nodePool: {
                name: args.nodePoolName,
                size: args.nodeSize,
                nodeCount: args.nodeCount || 1,
            },
        }, { parent: this });

        // Get the kubeconfig from the cluster
        const kubeconfig = this.cluster.kubeConfigs.apply(kubeConfigs => kubeConfigs[0].rawConfig);

        // Create a Kubernetes provider using the cluster's kubeconfig
        this.k8sProvider = new k8s.Provider("do-k8s-provider", {
            kubeconfig: kubeconfig,
        }, {
            parent: this,
            dependsOn: [this.cluster]
        });

        this.registerOutputs({
            k8sProvider: this.k8sProvider,
            cluster: this.cluster
        });
    }
}

/**
 * Factory function to create a DOK8sCluster instance.
 * @param name Resource name
 * @param args Configuration arguments for the cluster
 * @param opts Optional Pulumi resource options
 * @returns DOK8sCluster instance
 */
export function createDOK8sCluster(name: string, args: {
    clusterName: string;
    nodePoolName: string;
    nodeSize: string;
    region?: digitalocean.Region;
    version?: string;
    nodeCount?: number;
}, opts?: pulumi.ComponentResourceOptions): DOK8sCluster {
    return new DOK8sCluster(name, args, opts);
}