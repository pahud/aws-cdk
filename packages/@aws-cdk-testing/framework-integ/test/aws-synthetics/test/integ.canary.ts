/// !cdk-integ canary-one

import * as path from 'path';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib/core';
import { Canary, Cleanup, Code, Runtime, Schedule, Test } from 'aws-cdk-lib/aws-synthetics';
import { ExpectedResult, IntegTest } from '@aws-cdk/integ-tests-alpha';
import { RemovalPolicy } from 'aws-cdk-lib';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'canary-one');

const bucket = new s3.Bucket(stack, 'MyTestBucket', {
  removalPolicy: RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
});
const prefix = 'integ';

const api = new apigateway.RestApi(stack, 'ApiGateway');
api.root.addMethod('GET', new apigateway.MockIntegration({
  integrationResponses: [{
    statusCode: '200',
  }],
  passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
  requestTemplates: {
    'application/json': '{ "statusCode": 200 }',
  },
}), {
  methodResponses: [{ statusCode: '200' }],
});

const inlineAsset = new Canary(stack, 'InlineAsset', {
  test: Test.custom({
    handler: 'index.handler',
    code: Code.fromInline(`
      exports.handler = async () => {
        console.log(\'hello world\');
      };`),
  }),
  schedule: Schedule.rate(cdk.Duration.minutes(1)),
  artifactsBucketLocation: { bucket, prefix },
  runtime: Runtime.SYNTHETICS_NODEJS_PUPPETEER_7_0,
  cleanup: Cleanup.LAMBDA,
});

const directoryAsset = new Canary(stack, 'DirectoryAsset', {
  test: Test.custom({
    handler: 'canary.handler',
    code: Code.fromAsset(path.join(__dirname, 'canaries')),
  }),
  runtime: Runtime.SYNTHETICS_NODEJS_PUPPETEER_7_0,
  environmentVariables: {
    URL: api.url,
  },
  cleanup: Cleanup.LAMBDA,
});

const folderAsset = new Canary(stack, 'FolderAsset', {
  test: Test.custom({
    handler: 'folder/canary.functionName',
    code: Code.fromAsset(path.join(__dirname, 'canaries')),
  }),
  runtime: Runtime.SYNTHETICS_NODEJS_PUPPETEER_7_0,
  environmentVariables: {
    URL: api.url,
  },
  cleanup: Cleanup.LAMBDA,
});

const zipAsset = new Canary(stack, 'ZipAsset', {
  test: Test.custom({
    handler: 'canary.handler',
    code: Code.fromAsset(path.join(__dirname, 'canary.zip')),
  }),
  artifactsBucketLifecycleRules: [
    {
      expiration: cdk.Duration.days(30),
    },
  ],
  runtime: Runtime.SYNTHETICS_NODEJS_PUPPETEER_7_0,
  cleanup: Cleanup.LAMBDA,
});

const kebabToPascal = (text:string) => text.replace(/(^\w|[-./]\w)/g, (v) => v.replace(/[-./]/, '').toUpperCase());
const createCanaryByRuntimes = (runtime: Runtime, handler?: string) =>
  new Canary(stack, kebabToPascal(runtime.name + (handler ?? '')), {
    test: Test.custom({
      handler: handler ?? 'canary.handler',
      code: Code.fromAsset(path.join(__dirname, 'canaries')),
    }),
    environmentVariables: {
      URL: api.url,
    },
    runtime,
    cleanup: Cleanup.LAMBDA,
  });

const puppeteer52 = createCanaryByRuntimes(Runtime.SYNTHETICS_NODEJS_PUPPETEER_5_2);
const puppeteer62 = createCanaryByRuntimes(Runtime.SYNTHETICS_NODEJS_PUPPETEER_6_2);
const puppeteer70 = createCanaryByRuntimes(Runtime.SYNTHETICS_NODEJS_PUPPETEER_7_0);
const puppeteer80 = createCanaryByRuntimes(Runtime.SYNTHETICS_NODEJS_PUPPETEER_8_0);
const puppeteer90 = createCanaryByRuntimes(Runtime.SYNTHETICS_NODEJS_PUPPETEER_9_0);
const puppeteer91 = createCanaryByRuntimes(Runtime.SYNTHETICS_NODEJS_PUPPETEER_9_1);
const playwright10 = createCanaryByRuntimes(Runtime.SYNTHETICS_NODEJS_PLAYWRIGHT_1_0);
const playwright10_with_handler_name = createCanaryByRuntimes(Runtime.SYNTHETICS_NODEJS_PLAYWRIGHT_1_0, 'playwright/canary.handler');
const playwright20 = createCanaryByRuntimes(Runtime.SYNTHETICS_NODEJS_PLAYWRIGHT_2_0);
const playwright20_with_handler_name = createCanaryByRuntimes(Runtime.SYNTHETICS_NODEJS_PLAYWRIGHT_2_0, 'playwright/canary.handler');

const selenium21 = createCanaryByRuntimes(Runtime.SYNTHETICS_PYTHON_SELENIUM_2_1);
const selenium30 = createCanaryByRuntimes(Runtime.SYNTHETICS_PYTHON_SELENIUM_3_0);
const selenium40 = createCanaryByRuntimes(Runtime.SYNTHETICS_PYTHON_SELENIUM_4_0);
const selenium41 = createCanaryByRuntimes(Runtime.SYNTHETICS_PYTHON_SELENIUM_4_1);
const selenium50 = createCanaryByRuntimes(Runtime.SYNTHETICS_PYTHON_SELENIUM_5_0);
const selenium51 = createCanaryByRuntimes(Runtime.SYNTHETICS_PYTHON_SELENIUM_5_1);
const selenium60 = createCanaryByRuntimes(Runtime.SYNTHETICS_PYTHON_SELENIUM_6_0);

const test = new IntegTest(app, 'IntegCanaryTest', {
  testCases: [stack],
});

// Assertion that all Canary's are Passed
[
  inlineAsset,
  directoryAsset,
  folderAsset,
  zipAsset,
  puppeteer52,
  puppeteer62,
  puppeteer70,
  puppeteer80,
  puppeteer90,
  puppeteer91,
  playwright10,
  playwright10_with_handler_name,
  playwright20,
  playwright20_with_handler_name,
  selenium21,
  selenium30,
  selenium40,
  selenium41,
  selenium50,
  selenium51,
  selenium60,
].forEach((canary) => test.assertions
  .awsApiCall('Synthetics', 'getCanaryRuns', {
    Name: canary.canaryName,
  })
  .assertAtPath('CanaryRuns.0.Status.State', ExpectedResult.stringLikeRegexp('PASSED'))
  .waitForAssertions({ totalTimeout: cdk.Duration.minutes(5) }));
