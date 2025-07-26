import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";
// Correct import for the NodePool type for input arguments
import { KubernetesClusterNodePool } from "@pulumi/digitalocean/types/input";
import * as k8s from "@pulumi/kubernetes";

/**
 * DOK8sClusterArgs defines the arguments for creating a DigitalOcean Kubernetes cluster.
 */
export interface DOK8sClusterArgs {
    clusterName: string;
    region?: digitalocean.Region;
    version?: string;
    autoUpgrade?: boolean;
    ha?: boolean;
    surgeUpgrade?: boolean;
    clusterTags?: pulumi.Input<pulumi.Input<string>[]>;
    vpcUuid?: string;
    clusterSubnet?: string;
    serviceSubnet?: string;
    // nodePool will now be a single configuration object for the primary node pool.
    nodePool: { // This defines the shape of the single node pool
        name: string;
        size: string;
        count: number;
        autoScale?: boolean;
        minNodes?: number;
        maxNodes?: number;
        tags?: pulumi.Input<pulumi.Input<string>[]>;
    };
    // If you ever need additional node pools, you would create separate digitalocean.KubernetesNodePool resources.
}

/**
 * DOK8sCluster is a ComponentResource that manages a DigitalOcean Kubernetes cluster and Kubernetes provider.
 */
export class DOK8sCluster extends pulumi.ComponentResource {
    public readonly k8sProvider: k8s.Provider;
    public readonly cluster: digitalocean.KubernetesCluster;
    public readonly kubeconfig: pulumi.Output<string>;

    constructor(name: string, args: DOK8sClusterArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:cluster:DOK8sCluster", name, {}, opts);

        // Map the provided nodePool argument to the digitalocean.types.input.KubernetesClusterNodePool type
        const nodePoolConfig: KubernetesClusterNodePool = {
            name: args.nodePool.name,
            size: args.nodePool.size,
            nodeCount: args.nodePool.count,
            autoScale: args.nodePool.autoScale,
            minNodes: args.nodePool.minNodes,
            maxNodes: args.nodePool.maxNodes,
            tags: args.nodePool.tags,
        };

        // Create the DigitalOcean Kubernetes cluster
        this.cluster = new digitalocean.KubernetesCluster(args.clusterName, {
            name: args.clusterName,
            region: args.region || digitalocean.Region.BLR1,
            version: args.version || "1.33.1-do.2",
            autoUpgrade: args.autoUpgrade !== undefined ? args.autoUpgrade : false, // Default to false if not provided
            ha: args.ha !== undefined ? args.ha : false, // Default to false if not provided
            surgeUpgrade: args.surgeUpgrade !== undefined ? args.surgeUpgrade : true, // Default to true if not provided
            tags: args.clusterTags,
            vpcUuid: args.vpcUuid,
            clusterSubnet: args.clusterSubnet,
            serviceSubnet: args.serviceSubnet,
            nodePool: nodePoolConfig, // Assign the single node pool object here
        }, { parent: this });

        // Get the kubeconfig from the cluster
        this.kubeconfig = this.cluster.kubeConfigs.apply(kubeConfigs => kubeConfigs[0].rawConfig);

        // Create a Kubernetes provider using the cluster's kubeconfig
        this.k8sProvider = new k8s.Provider("do-k8s-provider", {
            kubeconfig: this.kubeconfig,
        }, {
            parent: this,
            dependsOn: [this.cluster]
        });

        this.registerOutputs({
            k8sProvider: this.k8sProvider,
            cluster: this.cluster,
            kubeconfig: this.kubeconfig
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
export function createDOK8sCluster(name: string, args: DOK8sClusterArgs, opts?: pulumi.ComponentResourceOptions): DOK8sCluster {
    return new DOK8sCluster(name, args, opts);
}

// Example usage demonstrating the arguments, consistent with the doctl command
// const myCluster = createDOK8sCluster("my-do-cluster", {
//     clusterName: "fit-daksha-cluster",
//     region: digitalocean.Region.BLR1,
//     version: "1.33.1-do.2",
//     autoUpgrade: false,
//     ha: false,
//     surgeUpgrade: true,
//     clusterTags: ["k8s"],
//     vpcUuid: "441b360e-8036-4bed-b4b5-1cb1df04609a",
//     clusterSubnet: "10.110.0.0/16",
//     serviceSubnet: "10.111.0.0/22",
//     nodePool: { // This is the single node pool as per the doctl command
//         name: "sit-initial-pool",
//         size: "s-1vcpu-2gb",
//         count: 1,
//         autoScale: false,
//         tags: ["k8s", "k8s:worker", "terraform:default-node-pool"],
//     },
// });