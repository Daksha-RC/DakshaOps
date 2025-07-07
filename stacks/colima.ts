import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";
import * as fs from "fs";
import * as path from "path";

/**
 * ColimaCluster is a ComponentResource that manages a Colima Kubernetes cluster and Kubernetes provider.
 */
export class ColimaCluster extends pulumi.ComponentResource {
    public readonly k8sProvider: k8s.Provider;
    public readonly colimaStart: command.local.Command;

    constructor(name: string, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:cluster:ColimaCluster", name, {}, opts);

        // Command to check if 'colima' executable is available
        const colimaCheck = new command.local.Command("colima-check", {
            create: `
                if ! command -v colima >/dev/null 2>&1; then
                  echo "Error: 'colima' not found in PATH. Please install Colima and ensure it's available in your PATH.";
                  exit 1;
                fi
                echo "colima exists in PATH."
            `,
        }, { parent: this });

        // Start Colima only if not running, else do nothing
        this.colimaStart = new command.local.Command("start-colima", {
            create: `
                set -e
                if ! (colima ls --profile default | grep -q Running); then
                    colima start --memory 8 --cpu 8 --kubernetes --runtime containerd --k3s-arg "--disable=traefik" --k3s-arg "--disable=servicelb" --vm-type=vz --vz-rosetta;
                else
                    echo "Colima already running.";
                fi
            `,
            delete: "colima delete || true"
        }, { parent: this, dependsOn: [colimaCheck] });

        // 4. Read kubeconfig from the default location
        const kubeconfig = this.colimaStart.stdout.apply(_ => {
            const kubeconfigPath = path.join(process.env.HOME || "~", ".kube", "config");
            return fs.readFileSync(kubeconfigPath, "utf8");
        });

        // 5. Create a Kubernetes provider using Colima's kubeconfig
        this.k8sProvider = new k8s.Provider("colima-provider", {
            kubeconfig: kubeconfig,
        }, {
            parent: this,
            dependsOn: [this.colimaStart]
        });

        this.registerOutputs({
            k8sProvider: this.k8sProvider,
            colimaStart: this.colimaStart
        });
    }
}

/**
 * Factory function to create a ColimaCluster instance.
 * @param name Resource name
 * @param opts Optional Pulumi resource options
 * @returns ColimaCluster instance
 */
export function createColimaCluster(name: string, opts?: pulumi.ComponentResourceOptions): ColimaCluster {
    return new ColimaCluster(name, opts);
}