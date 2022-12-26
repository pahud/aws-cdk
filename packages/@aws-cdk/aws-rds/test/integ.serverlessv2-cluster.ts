import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import * as integ from '@aws-cdk/integ-tests';
import * as rds from '../lib';

const app = new cdk.App();

const env = {
  region: process.env.CDK_DEFAULT_REGION,
  account: process.env.CDK_DEFAULT_ACCOUNT,
};

const stack = new cdk.Stack(app, 'aws-cdk-rds-integ', { env });

// const vpc = new ec2.Vpc(stack, 'VPC', { maxAzs: 2, natGateways: 1 });

const vpc = ec2.Vpc.fromLookup(stack, 'MyVpc', { isDefault: true });

const instanceProps: rds.InstanceProps = {
  vpc,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
};

/**
 * Adding instances into the existing aurora-mysql provisioned cluster that has one provisoined writer and one provisioned reader.
 */
const cluster1 = new rds.DatabaseCluster(stack, 'cluster1', {
  engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_3_02_1 }),
  serverlessV2Scaling: {
    maxCapacity: 4,
    minCapacity: 0.5,
  },
  // writer and reader
  instances: 2,
  instanceProps,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// 2 readers
cluster1.addServerlessInstance('c1instance1');
cluster1.addProvisionedInstance('c1instance2');

/**
 * Adding instances into the existing aurora-postgres provisioned cluster that has one provisoined writer and one provisioned reader.
 */
const cluster2 = new rds.DatabaseCluster(stack, 'cluster2', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_14_5 }),
  serverlessV2Scaling: {
    maxCapacity: 4,
    minCapacity: 0.5,
  },
  // writer and reader
  instances: 2,
  instanceProps,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// 2 readers
cluster2.addServerlessInstance('c2instance1');
cluster2.addProvisionedInstance('c2instance2');

/**
 * Serverless writer and provisioned reader
 */
const cluster3 = new rds.DatabaseCluster(stack, 'cluster3', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_14_5 }),
  serverlessV2Scaling: {
    maxCapacity: 4,
    minCapacity: 0.5,
  },
  instances: 0,
  instanceProps,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// writer and reader
const c3writer = cluster3.addServerlessInstance('c3writer');
const c3reader = cluster3.addProvisionedInstance('c3reader');
c3reader.node.addDependency(c3writer);

/**
 * Serverless reader and provisioned writer
 */
const cluster4 = new rds.DatabaseCluster(stack, 'cluster4', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_14_5 }),
  serverlessV2Scaling: {
    maxCapacity: 4,
    minCapacity: 0.5,
  },
  instances: 0,
  instanceProps,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// writer and reader
const c4writer = cluster4.addProvisionedInstance('c4writer');
const c4reader = cluster4.addServerlessInstance('c4reader');
c4reader.node.addDependency(c4writer);

new integ.IntegTest(app, 'ServerlessV2Test', {
  testCases: [stack],
});

app.synth();