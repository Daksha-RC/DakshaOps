import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

interface RedisCredentialsArgs {
    namespace: pulumi.Input<string>;
    secretName: pulumi.Input<string>;
}

export class RedisCredentials extends pulumi.ComponentResource {
    public readonly password: pulumi.Output<string>;

    constructor(name: string, args: RedisCredentialsArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshsOps:component:RedisCredentials", name, {}, opts);

        const secret = k8s.core.v1.Secret.get(`${name}-secret`, pulumi.interpolate`${args.namespace}/${args.secretName}`, { parent: this });

        // The 'redis-password' key from the secret's data (assumed to be base64 encoded)
        this.password = secret.data.apply(data => {
            if (!data || !data["redis-password"]) {
                throw new Error(`Secret '${args.secretName}' in namespace '${args.namespace}' does not contain key "redis-password"`);
            }
            // Pulumi secrets are usually base64 encoded, decode here
            return pulumi.secret(Buffer.from(data["redis-password"], "base64").toString());
        });

        // Print helpful information after Pulumi run
        pulumi.all([args.secretName, args.namespace]).apply(([secret, ns]) => {
            console.log(`\nThe secret containing Redis credentials is: "${secret}" (namespace: "${ns}")`);
            console.log(`kubectl get secret ${secret} -n ${ns} -o jsonpath="{.data.redis-password}" | base64 --decode && echo`);
        });

        this.registerOutputs({
            password: this.password,
        });
    }
}

// Factory function
export function createRedisCredentials(name: string, args: RedisCredentialsArgs, opts?: pulumi.ComponentResourceOptions) {
    return new RedisCredentials(name, args, opts);
}