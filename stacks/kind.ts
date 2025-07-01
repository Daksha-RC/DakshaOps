import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";
import * as fs from "fs";

/**
 * Creates a Kind cluster and returns a Kubernetes provider configured to use it
 * @returns A Kubernetes provider configured to use the Kind cluster and the kind cluster resource
 */
export function createKindCluster(): { k8sProvider: k8s.Provider, kindCluster: command.local.Command } {
    // 1. Create Kind cluster (idempotent)
    const kindCluster = new command.local.Command("create-kind-cluster", {
        create: "kind create cluster --name dev --config infra/kind-config-dev.yaml || true",
        delete: "kind delete cluster --name dev",
    });

    // 2. Get kubeconfig (after cluster is created)
    const kubeconfig = kindCluster.stdout.apply(_ => {
        // Kind stores kubeconfig in the default location
        return fs.readFileSync(`${process.env.HOME}/.kube/config`, "utf8");
    });

    // 3. Create Kubernetes provider using Kind's kubeconfig
    const k8sProvider = new k8s.Provider("kind-provider", {
        kubeconfig: kubeconfig,
    }, {
        dependsOn: [kindCluster]
    });

    return { k8sProvider, kindCluster };
}
