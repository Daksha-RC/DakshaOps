import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

interface DebCredentialsArgs {
    namespace: pulumi.Input<string>;
    secretName: pulumi.Input<string>;
}

export class DebCredentials extends pulumi.ComponentResource {
    public readonly uri: pulumi.Output<string>;

    constructor(name: string, args: DebCredentialsArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:component:DebCredentials", name, {}, opts);

        const secret = k8s.core.v1.Secret.get(`${name}-secret`, pulumi.interpolate`${args.namespace}/${args.secretName}`, { parent: this });

        // The 'uri' key from the secret's data (assumed to be base64 encoded)
        this.uri = secret.data.apply(data => {
            if (!data || !data["uri"]) {
                throw new Error(`Secret '${args.secretName}' in namespace '${args.namespace}' does not contain key "uri"`);
            }
            // Pulumi secrets are usually base64 encoded, decode here
            return pulumi.secret(Buffer.from(data["uri"], "base64").toString());
        });

        this.registerOutputs({
            uri: this.uri,
        });
    }
}

// Factory function
export function createDebCredentials(name: string, args: DebCredentialsArgs, opts?: pulumi.ComponentResourceOptions) {
    return new DebCredentials(name, args, opts);
}