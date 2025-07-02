import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";
import * as fs from "fs";

/**
 * KindCluster is a ComponentResource that creates a Kind cluster and a Kubernetes provider
 */
export class KindCluster extends pulumi.ComponentResource {
    public readonly k8sProvider: k8s.Provider;
    public readonly kindCluster: command.local.Command;

    constructor(name: string, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:cluster:KindCluster", name, {}, opts);

        // Initialize config for your project (named 'daksha-ops')
        const config = new pulumi.Config("cluster");

// Get the 'kindConfigPath' value
        const kindConfigPath = config.require("kindConfigPath");


        // 1. Create Kind cluster (idempotent)
        this.kindCluster = new command.local.Command("create-kind-cluster", {
            create: pulumi.interpolate`kind create cluster --name dev --config ${kindConfigPath} || true`,
            delete: "kind delete cluster --name dev",
        }, {parent: this});

        // 2. Get kubeconfig (after cluster is created)
        const kubeconfig = this.kindCluster.stdout.apply(_ => {
            // Kind stores kubeconfig in the default location
            return fs.readFileSync(`${process.env.HOME}/.kube/config`, "utf8");
        });

        // 3. Create Kubernetes provider using Kind's kubeconfig
        this.k8sProvider = new k8s.Provider("kind-provider", {
            kubeconfig: kubeconfig,
        }, {
            parent: this,
            dependsOn: [this.kindCluster]
        });

        this.registerOutputs({
            k8sProvider: this.k8sProvider,
            kindCluster: this.kindCluster
        });
    }
}

