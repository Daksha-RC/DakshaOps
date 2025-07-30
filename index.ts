import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { createDbInstance, createDbUserAndDatabase } from "./stacks/cloudsql";
import { createDefaultNetworkPeering } from "./stacks/networkpeering";
import { createRcAppGcp, RcAppGcp } from "./stacks/rc-app-gcp";

// 0. Create the network peering. This must exist before the database.
const networkPeer = createDefaultNetworkPeering(gcp.config.project!);

const dbConfig = new pulumi.Config("db");
const activationPolicy = dbConfig.get("activationPolicy");

// 1. Create a single, shared Cloud SQL Database Instance
// This instance explicitly depends on the network peering connection being ready.
const dbInstance = createDbInstance("shared-postgres-instance", {
    activationPolicy: activationPolicy,
    dependsOn: [networkPeer.peeringConnection],
});

// --- DEV Environment --- //

// 2a. Get the configuration for the 'dev' environment
const devConfig = new pulumi.Config("dev");
const devDbName = devConfig.require("dbName");
const devUserName = devConfig.require("userName");
const devPassword = devConfig.requireSecret("password");

// 3a. Create the 'dev' database and user
const devDb = createDbUserAndDatabase("dev-db-user", {
    dbName: devDbName,
    userName: devUserName,
    password: devPassword,
    instanceName: dbInstance.instanceName,
    dependsOn: [dbInstance.instance],
});

// --- SIT Environment --- //

// 2b. Get the configuration for the 'sit' environment
const sitConfig = new pulumi.Config("sit");
const sitDbName = sitConfig.require("dbName");
const sitUserName = sitConfig.require("userName");
const sitPassword = sitConfig.requireSecret("password");

// 3b. Create the 'sit' database and user
const sitDb = createDbUserAndDatabase("sit-db-user", {
    dbName: sitDbName,
    userName: sitUserName,
    password: sitPassword,
    instanceName: dbInstance.instanceName,
    dependsOn: [dbInstance.instance],
});

// 4. Conditionally create the Cloud Run application
let sitApp: RcAppGcp | undefined;
if (activationPolicy === "ALWAYS") {
    const clientOriginUrl = sitConfig.require("clientOriginUrl");
    sitApp = createRcAppGcp("sit-rc-app", {
        location: gcp.config.region!,
        databaseUrl: pulumi.interpolate`postgres://${sitDb.userName}:${sitPassword}@localhost/${sitDb.databaseName}?host=/cloudsql/${dbInstance.connectionName}`,
        clientOriginUrl: clientOriginUrl,
        cloudsqlInstances: [dbInstance.connectionName],
        dependsOn: [sitDb],
    });
}

// --- Exports --- //

export const instanceConnectionName = dbInstance.connectionName;
export const devDatabaseName = devDb.databaseName;
export const devDatabaseUserName = devDb.userName;
export const sitDatabaseName = sitDb.databaseName;
export const sitDatabaseUserName = sitDb.userName;
export const configuredActivationPolicy = activationPolicy;
export const actualActivationPolicy = dbInstance.instance.settings.apply(s => s.activationPolicy);

// Conditionally export the Cloud Run URL
export const sitAppUrl = sitApp ? sitApp.url : "SKIPPED";