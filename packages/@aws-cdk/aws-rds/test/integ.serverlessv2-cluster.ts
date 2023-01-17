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

// const vpc = new ec2.Vpc(stack, 'VPC', { maxAzs: 3, natGateways: 1 });
const vpc = ec2.Vpc.fromLookup(stack, 'Vpc', { isDefault: true });

/**
 * create a new aurora serverless-v2 cluster with one writer and two readers(aurora-mysql).
 */
new rds.DatabaseClusterV2(stack, 'cluster1', {
  engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_3_02_1 }),
  vpc,
  writer: { serverless: true },
  // customize the serverless v2 scaling
  serverlessV2Scaling: {
    maxCapacity: 4,
    minCapacity: 0.5,
  },
  readers: [
    // reader 1
    {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.LARGE),
    },
    // reader 2
    { serverless: true },
  ],
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

/**
 * create a new aurora serverless-v2 cluster with one writer and two readers(aurora-postgres).
 */
new rds.DatabaseClusterV2(stack, 'cluster2', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_14_5 }),
  vpc,
  writer: { serverless: true },
  readers: [
    // reader 1
    {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.LARGE),
    },
    // reader 2
    { serverless: true },
  ],
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

new integ.IntegTest(app, 'ServerlessV2Test', {
  testCases: [stack],
});

app.synth();