import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import { createDbInstance, createDbUserAndDatabase } from "./stacks/cloudsql";
import { createDefaultNetworkPeering } from "./stacks/networkpeering";

// 0. Create the network peering. This must exist before the database.
const networkPeer = createDefaultNetworkPeering(gcp.config.project!);

// 1. Create a single, shared Cloud SQL Database Instance
// This instance explicitly depends on the network peering connection being ready.
const dbInstance = createDbInstance("shared-postgres-instance", {
    dependsOn: [networkPeer.peeringConnection],
});

// --- DEV Environment --- //

// 2a. Get the configuration for the 'dev' environment
const devConfig = new pulumi.Config("dev");
const devDbName = devConfig.require("dbName");
const devUserName = devConfig.require("userName");
const devPassword = devConfig.requireSecret("password");

// 3a. Create the 'dev' database and user
// This resource explicitly depends on the dbInstance being ready.
const devDb = createDbUserAndDatabase("dev-db-user", {
    dbName: devDbName,
    userName: devUserName,
    password: devPassword,
    dbInstance: dbInstance,
    dependsOn: [dbInstance.instance,networkPeer.peeringConnection],
});

// --- SIT Environment --- //

// 2b. Get the configuration for the 'sit' environment
const sitConfig = new pulumi.Config("sit");
const sitDbName = sitConfig.require("dbName");
const sitUserName = sitConfig.require("userName");
const sitPassword = sitConfig.requireSecret("password");

// 3b. Create the 'sit' database and user
// This resource also explicitly depends on the dbInstance being ready.
const sitDb = createDbUserAndDatabase("sit-db-user", {
    dbName: sitDbName,
    userName: sitUserName,
    password: sitPassword,
    dbInstance: dbInstance,
    dependsOn: [dbInstance.instance,networkPeer.peeringConnection],
});

// --- Exports --- //

// Export the shared instance connection name
export const instanceConnectionName = dbInstance.connectionName;

// Export details for the 'dev' database
export const devDatabaseName = devDb.databaseName;
export const devDatabaseUserName = devDb.userName;

// Export details for the 'sit' database
export const sitDatabaseName = sitDb.databaseName;
export const sitDatabaseUserName = sitDb.userName;