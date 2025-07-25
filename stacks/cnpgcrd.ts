import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as command from "@pulumi/command";
import {CustomResource} from "@pulumi/pulumi";

// 1. Define the input arguments interface
export interface CnpgCrdArgs {
    kubeconfig: pulumi.Output<string>; // Add kubeconfig secret
    dependsOn?: pulumi.Resource[];
}

// 2. ComponentResource for CNPG CRDs
export class CnpgCrd extends pulumi.ComponentResource {
    public readonly crds: command.local.Command;
    public readonly crdReady: command.local.Command;

    constructor(name: string, args: CnpgCrdArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:crds:CloudNativePG", name, {}, opts);

        const {kubeconfig, dependsOn} = args;

        const cnpgYamlUrl = "infra/cnpg-1.26.0.yaml";
        const cnpgOperatorDeploymentName = "cnpg-controller-manager";
        const cnpgOperatorNamespace = "cnpg-system"; // The namespace where the operator is installed

        // Command to apply the CNPG CRDs and operator using the provided kubeconfig
        this.crds = new command.local.Command("apply-cnpg-manifest", {
            create: kubeconfig.apply(kc => `
                set -e
                TMP_KUBECONFIG=$(mktemp)
                trap 'rm -f "$TMP_KUBECONFIG"' EXIT
                printf "%s" '${kc}' > "$TMP_KUBECONFIG"
                KUBECONFIG="$TMP_KUBECONFIG" kubectl apply --server-side -f ${cnpgYamlUrl}
            `),
            delete: kubeconfig.apply(kc => `
                set -e
                TMP_KUBECONFIG=$(mktemp)
                trap 'rm -f "$TMP_KUBECONFIG"' EXIT
                printf "%s" '${kc}' > "$TMP_KUBECONFIG"
                KUBECONFIG="$TMP_KUBECONFIG" kubectl delete -f ${cnpgYamlUrl} --ignore-not-found=true
            `),
        }, {
            dependsOn: dependsOn,
            parent: this,
        });

        // Command to wait for a specific CNPG CRD (e.g., 'clusters.cnpg.io') to be established
        this.crdReady = new command.local.Command(`${name}-wait-cnpg-crd`, {
            create: kubeconfig.apply(kc => `
                set -e
                TMP_KUBECONFIG=$(mktemp)
                trap 'rm -f "$TMP_KUBECONFIG"' EXIT
                printf "%s" '${kc}' > "$TMP_KUBECONFIG"
                KUBECONFIG="$TMP_KUBECONFIG" kubectl wait --for=condition=established crd/clusters.postgresql.cnpg.io --timeout=300s
            `),
            // No delete command needed for waiting.
        }, {
            dependsOn: [...(dependsOn || [])], // Depends on the operator being ready
            parent: this,
        });

        this.registerOutputs({
            crds: this.crds,
            crdReady: this.crdReady,
        });
    }
}

// 3. Factory function for convenience
export function createCnpgCrd(
    name: string,
    kubeconfig: pulumi.Output<string>, // Add kubeconfig parameter
    dependsOn?: pulumi.Resource[],
): CnpgCrd {
    return new CnpgCrd(name, {kubeconfig, dependsOn});
}