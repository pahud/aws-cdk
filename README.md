# AWS Cloud Development Kit (AWS CDK)

![Build Status](https://codebuild.us-east-1.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiSy9rWmVENzRDbXBoVlhYaHBsNks4OGJDRXFtV1IySmhCVjJoaytDU2dtVWhhVys3NS9Odk5DbC9lR2JUTkRvSWlHSXZrNVhYQ3ZsaUJFY3o4OERQY1pnPSIsIml2UGFyYW1ldGVyU3BlYyI6IlB3ODEyRW9KdU0yaEp6NDkiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=main)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/aws/aws-cdk)
[![NPM version](https://badge.fury.io/js/aws-cdk.svg)](https://badge.fury.io/js/aws-cdk)
[![PyPI version](https://badge.fury.io/py/aws-cdk.core.svg)](https://badge.fury.io/py/aws-cdk.core)
[![NuGet version](https://badge.fury.io/nu/Amazon.CDK.svg)](https://badge.fury.io/nu/Amazon.CDK)
[![Maven Central](https://maven-badges.herokuapp.com/maven-central/software.amazon.awscdk/core/badge.svg)](https://maven-badges.herokuapp.com/maven-central/software.amazon.awscdk/core)
[![Go Reference](https://pkg.go.dev/badge/github.com/aws/aws-cdk-go/awscdk.svg)](https://pkg.go.dev/github.com/aws/aws-cdk-go/awscdk)
[![Mergify](https://img.shields.io/endpoint.svg?url=https://gh.mergify.io/badges/aws/aws-cdk&style=flat)](https://mergify.io)

[![View on Construct Hub](https://constructs.dev/badge?package=aws-cdk-lib)](https://constructs.dev/packages/aws-cdk-lib)

The **AWS Cloud Development Kit (AWS CDK)** is an open-source software development
framework to define cloud infrastructure in code and provision it through AWS CloudFormation.

It offers a high-level object-oriented abstraction to define AWS resources imperatively using
the power of modern programming languages. Using the CDK’s library of
infrastructure constructs, you can easily encapsulate AWS best practices in your
infrastructure definition and share it without worrying about boilerplate logic.

The CDK is available in the following languages:

* JavaScript, TypeScript ([Node.js ≥ 14.15.0](https://nodejs.org/download/release/latest-v14.x/))
  - We recommend using a version in [Active LTS](https://nodejs.org/en/about/releases/)
* Python ([Python ≥ 3.6](https://www.python.org/downloads/))
* Java ([Java ≥ 8](https://www.oracle.com/technetwork/java/javase/downloads/index.html) and [Maven ≥ 3.5.4](https://maven.apache.org/download.cgi))
* .NET ([.NET Core ≥ 3.1](https://dotnet.microsoft.com/download))
* Go ([Go ≥ 1.16.4](https://golang.org/))

Third-party Language Deprecation: language version is only supported until its EOL (End Of Life) shared by the vendor or community and is subject to change with prior notice.

\
Jump To:
[Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide) |
[API Reference](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html) |
[Getting Started](#getting-started) |
[Getting Help](#getting-help) |
[Contributing](#contributing) |
[RFCs](https://github.com/aws/aws-cdk-rfcs) |
[Roadmap](https://github.com/aws/aws-cdk/blob/main/ROADMAP.md) |
[More Resources](#more-resources)

-------

Developers use the [CDK framework] in one of the
supported programming languages to define reusable cloud components called [constructs], which
are composed together into [stacks], forming a "CDK app".

They then use the [AWS CDK CLI] to interact with their CDK app. The CLI allows developers to
synthesize artifacts such as AWS CloudFormation Templates, deploy stacks to development AWS accounts and "diff"
against a deployed stack to understand the impact of a code change.

The [AWS Construct Library] includes a module for each
AWS service with constructs that offer rich APIs that encapsulate the details of
how to use AWS. The AWS Construct Library aims to reduce the complexity and
glue-logic required when integrating various AWS services to achieve your goals
on AWS.

Modules in the AWS Construct Library are designated Experimental while we build
them; experimental modules may have breaking API changes in any release.  After
a module is designated Stable, it adheres to [semantic versioning](https://semver.org/),
and only major releases can have breaking changes. Each module's stability designation
is available on its Overview page in the [AWS CDK API Reference](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html).
For more information, see [Versioning](https://docs.aws.amazon.com/cdk/latest/guide/reference.html#versioning)
in the CDK Developer Guide.

[CDK framework]: https://docs.aws.amazon.com/cdk/latest/guide/home.html
[constructs]: https://docs.aws.amazon.com/cdk/latest/guide/constructs.html
[stacks]: https://docs.aws.amazon.com/cdk/latest/guide/stacks.html
[apps]: https://docs.aws.amazon.com/cdk/latest/guide/apps.html
[Developer Guide]: https://docs.aws.amazon.com/cdk/latest/guide
[AWS CDK CLI]: https://docs.aws.amazon.com/cdk/latest/guide/tools.html
[AWS Construct Library]: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html


## Getting Started

For a detailed walkthrough, see the [tutorial](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#hello_world_tutorial) in the AWS CDK [Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/home.html).

### At a glance
Install or update the [AWS CDK CLI] from npm (requires [Node.js ≥ 14.15.0](https://nodejs.org/download/release/latest-v14.x/)). We recommend using a version in [Active LTS](https://nodejs.org/en/about/releases/)

```console
npm i -g aws-cdk
```

(See [Manual Installation](./MANUAL_INSTALLATION.md) for installing the CDK from a signed .zip file).

Initialize a project:

```console
mkdir hello-cdk
cd hello-cdk
cdk init sample-app --language=typescript
```

This creates a sample project looking like this:

```ts
export class HelloCdkStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'HelloCdkQueue', {
      visibilityTimeout: cdk.Duration.seconds(300)
    });

    const topic = new sns.Topic(this, 'HelloCdkTopic');

    topic.addSubscription(new subs.SqsSubscription(queue));
  }
}
```

Deploy this to your account:

```console
cdk deploy
```

Use the `cdk` command-line toolkit to interact with your project:

 * `cdk deploy`: deploys your app into an AWS account
 * `cdk synth`: synthesizes an AWS CloudFormation template for your app
 * `cdk diff`: compares your app with the deployed stack

## Getting Help

The best way to interact with our team is through GitHub. You can open an [issue](https://github.com/aws/aws-cdk/issues/new/choose) and choose from one of our templates for bug reports, feature requests, documentation issues, or guidance.

If you have a support plan with AWS Support, you can also create a new [support case](https://console.aws.amazon.com/support/home#/).

You may also find help on these community resources:
* Look through the [API Reference](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html) or [Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide)
* The #aws-cdk Slack channel in [cdk.dev](https://cdk.dev)
* Ask a question on [Stack Overflow](https://stackoverflow.com/questions/tagged/aws-cdk)
  and tag it with `aws-cdk`

## Roadmap

The [AWS CDK Roadmap project board](https://github.com/orgs/aws/projects/7) lets developers know about our upcoming features and priorities to help them plan how to best leverage the CDK and identify opportunities to contribute to the project. See [ROADMAP.md](https://github.com/aws/aws-cdk/blob/main/ROADMAP.md) for more information and FAQs.

## Contributing

We welcome community contributions and pull requests. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for information on how to set up a development
environment and submit code.

Thanks goes to these wonderful top community contributors:

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1080-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

<table>
<tr>
<td align="center"><a href="http://eladb.github.com"><img src="https://avatars.githubusercontent.com/u/598796?v=4" width="100px;" alt=""/><br /><sub><b>Elad Ben-Israel</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=eladb" title="distinguished-contributor(350 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/12623249?v=4" width="100px;" alt=""/><br /><sub><b>Jonathan Goldwasser</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=jogold" title="distinguished-contributor(322 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/16217941?v=4" width="100px;" alt=""/><br /><sub><b>Niranjan Jayakar</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=nija-at" title="distinguished-contributor(310 merged PRs)">💻</a></td>
<td align="center"><a href="http://endoflineblog.com"><img src="https://avatars.githubusercontent.com/u/460937?v=4" width="100px;" alt=""/><br /><sub><b>Adam Ruka</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=skinny85" title="distinguished-contributor(294 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/1376292?v=4" width="100px;" alt=""/><br /><sub><b>Nick Lynch</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=njlynch" title="distinguished-contributor(246 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/32604953?v=4" width="100px;" alt=""/><br /><sub><b>Shiv Lakshminarayan</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=shivlaks" title="distinguished-contributor(185 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/31543?v=4" width="100px;" alt=""/><br /><sub><b>Robert Djurasaj</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=robertd" title="distinguished-contributor(86 merged PRs)">💻</a></td>
</tr>
<tr>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/8578043?v=4" width="100px;" alt=""/><br /><sub><b>Neta Nir</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=NetaNir" title="distinguished-contributor(83 merged PRs)">💻</a></td>
<td align="center"><a href="http://nmussy.github.io/"><img src="https://avatars.githubusercontent.com/u/2505696?v=4" width="100px;" alt=""/><br /><sub><b>Jimmy Gaussen</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=nmussy" title="distinguished-contributor(55 merged PRs)">💻</a></td>
<td align="center"><a href="linktr.ee/hoegertn"><img src="https://avatars.githubusercontent.com/u/1287829?v=4" width="100px;" alt=""/><br /><sub><b>Thorsten Hoeger</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=hoegertn" title="star-contributor(49 merged PRs)">💻</a></td>
<td align="center"><a href="https://www.linkedin.com/in/julianmichel2/"><img src="https://avatars.githubusercontent.com/u/15660169?v=4" width="100px;" alt=""/><br /><sub><b>Julian Michel</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=jumic" title="star-contributor(48 merged PRs)">💻</a></td>
<td align="center"><a href="ayush987goyal.dev"><img src="https://avatars.githubusercontent.com/u/5697227?v=4" width="100px;" alt=""/><br /><sub><b>Ayush Goyal</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=ayush987goyal" title="star-contributor(45 merged PRs)">💻</a></td>
<td align="center"><a href="bryanpan.co"><img src="https://avatars.githubusercontent.com/u/44623317?v=4" width="100px;" alt=""/><br /><sub><b>Bryan Pan</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=BryanPan342" title="star-contributor(41 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/11013683?v=4" width="100px;" alt=""/><br /><sub><b>Tatsuya Yamamoto</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=yamatatsu" title="star-contributor(39 merged PRs)">💻</a></td>
</tr>
<tr>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/44981951?v=4" width="100px;" alt=""/><br /><sub><b>Piradeep Kandasamy</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=piradeepk" title="star-contributor(37 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/23043132?v=4" width="100px;" alt=""/><br /><sub><b>Somaya</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=SomayaB" title="star-contributor(35 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/29964746?v=4" width="100px;" alt=""/><br /><sub><b>Hsing-Hui Hsu</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=SoManyHs" title="star-contributor(34 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/16107690?v=4" width="100px;" alt=""/><br /><sub><b>Doug</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=Doug-AWS" title="star-contributor(32 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/3698184?v=4" width="100px;" alt=""/><br /><sub><b>Ben Chaimberg</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=BenChaimberg" title="star-contributor(29 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/57235867?v=4" width="100px;" alt=""/><br /><sub><b>flemjame-at-amazon</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=flemjame-at-amazon" title="star-contributor(27 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/644092?v=4" width="100px;" alt=""/><br /><sub><b>Josh Kellendonk</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=misterjoshua" title="admired-contributor(24 merged PRs)">💻</a></td>
</tr>
<tr>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/57131123?v=4" width="100px;" alt=""/><br /><sub><b>Joshua Weber</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=daschaa" title="admired-contributor(22 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/51377557?v=4" width="100px;" alt=""/><br /><sub><b>Penghao He</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=iamhopaul123" title="admired-contributor(22 merged PRs)">💻</a></td>
<td align="center"><a href="public.dev/sam"><img src="https://avatars.githubusercontent.com/u/38672686?v=4" width="100px;" alt=""/><br /><sub><b>sam</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=sam-goodwin" title="admired-contributor(22 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/664280?v=4" width="100px;" alt=""/><br /><sub><b>Mike Cowgill</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=moofish32" title="admired-contributor(21 merged PRs)">💻</a></td>
<td align="center"><a href="https://rybicki.io/"><img src="https://avatars.githubusercontent.com/u/5008987?v=4" width="100px;" alt=""/><br /><sub><b>Chris Rybicki</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=Chriscbr" title="admired-contributor(19 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/1659030?v=4" width="100px;" alt=""/><br /><sub><b>Alban Escalier</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=DaWyz" title="admired-contributor(19 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/527924?v=4" width="100px;" alt=""/><br /><sub><b>Christoph Gysin</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=christophgysin" title="admired-contributor(17 merged PRs)">💻</a></td>
</tr>
<tr>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/76135106?v=4" width="100px;" alt=""/><br /><sub><b>watany</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=watany-dev" title="admired-contributor(17 merged PRs)">💻</a></td>
<td align="center"><a href="https://kylelaker.com"><img src="https://avatars.githubusercontent.com/u/850893?v=4" width="100px;" alt=""/><br /><sub><b>Kyle Laker</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=kylelaker" title="admired-contributor(16 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/53624638?v=4" width="100px;" alt=""/><br /><sub><b>Daniel Neilson</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=ddneilson" title="admired-contributor(16 merged PRs)">💻</a></td>
<td align="center"><a href="patmyron.com"><img src="https://avatars.githubusercontent.com/u/7014355?v=4" width="100px;" alt=""/><br /><sub><b>Pat Myron</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=PatMyron" title="admired-contributor(16 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/29872445?v=4" width="100px;" alt=""/><br /><sub><b>arcrank</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=arcrank" title="admired-contributor(15 merged PRs)">💻</a></td>
<td align="center"><a href="https://benlimmer.com"><img src="https://avatars.githubusercontent.com/u/630449?v=4" width="100px;" alt=""/><br /><sub><b>Ben Limmer</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=blimmer" title="admired-contributor(15 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/5962998?v=4" width="100px;" alt=""/><br /><sub><b>Kyle Roach</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=iRoachie" title="admired-contributor(14 merged PRs)">💻</a></td>
</tr>
<tr>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/892367?v=4" width="100px;" alt=""/><br /><sub><b>Simon-Pierre Gingras</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=spg" title="admired-contributor(14 merged PRs)">💻</a></td>
<td align="center"><a href="https://clare.dev/"><img src="https://avatars.githubusercontent.com/u/484245?v=4" width="100px;" alt=""/><br /><sub><b>Clare Liguori</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=clareliguori" title="admired-contributor(14 merged PRs)">💻</a></td>
<td align="center"><a href="https://kane.mx"><img src="https://avatars.githubusercontent.com/u/843303?v=4" width="100px;" alt=""/><br /><sub><b>Meng Xin Zhu</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=zxkane" title="admired-contributor(14 merged PRs)">💻</a></td>
<td align="center"><a href="http://bdawg.org"><img src="https://avatars.githubusercontent.com/u/92937?v=4" width="100px;" alt=""/><br /><sub><b>Breland Miley</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=mindstorms6" title="admired-contributor(14 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/12596183?v=4" width="100px;" alt=""/><br /><sub><b>Jungseok Lee</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=jungseoklee" title="admired-contributor(13 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/4944099?v=4" width="100px;" alt=""/><br /><sub><b>Noah Litov</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=NGL321" title="admired-contributor(13 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/12930371?v=4" width="100px;" alt=""/><br /><sub><b>Seiya6329</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=Seiya6329" title="admired-contributor(13 merged PRs)">💻</a></td>
</tr>
<tr>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/80710604?v=4" width="100px;" alt=""/><br /><sub><b>Unnati Parekh</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=upparekh" title="valued-contributor(12 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/2849150?v=4" width="100px;" alt=""/><br /><sub><b>Barun Ray</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=SeekerWing" title="valued-contributor(12 merged PRs)">💻</a></td>
<td align="center"><a href="https://tmokmss.hatenablog.com/"><img src="https://avatars.githubusercontent.com/u/7490655?v=4" width="100px;" alt=""/><br /><sub><b>Masashi Tomooka</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=tmokmss" title="valued-contributor(12 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/7794947?v=4" width="100px;" alt=""/><br /><sub><b>Florian Eitel</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=workeitel" title="valued-contributor(12 merged PRs)">💻</a></td>
<td align="center"><a href="http://ericzbeard.com"><img src="https://avatars.githubusercontent.com/u/663183?v=4" width="100px;" alt=""/><br /><sub><b>Eric Z. Beard</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=ericzbeard" title="valued-contributor(12 merged PRs)">💻</a></td>
<td align="center"><a href=""><img src="https://avatars.githubusercontent.com/u/16692560?v=4" width="100px;" alt=""/><br /><sub><b>markussiebert</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=markussiebert" title="valued-contributor(11 merged PRs)">💻</a></td>
<td align="center"><a href="https://resume.kirintw.me"><img src="https://avatars.githubusercontent.com/u/11881669?v=4" width="100px;" alt=""/><br /><sub><b>kirintw</b></sub></a><br /><a href="https://github.com/aws/aws-cdk/commits?author=kirintwn" title="valued-contributor(11 merged PRs)">💻</a></td>
</tr>
</table>

## Metrics collection
This solution collects anonymous operational metrics to help AWS improve the
quality and features of the CDK. For more information, including how to disable
this capability, please see the 
[developer guide](https://docs.aws.amazon.com/cdk/latest/guide/cli.html#version_reporting).

## More Resources
* [CDK Workshop](https://cdkworkshop.com/)
* [Construct Hub](https://constructs.dev) - Find and use open-source Cloud Development Kit (CDK) libraries
* Best Practices
  * [Best practices for developing cloud applications with AWS CDK](https://aws.amazon.com/blogs/devops/best-practices-for-developing-cloud-applications-with-aws-cdk/)
  * [Align with best practices while creating infrastructure using cdk aspects](https://aws.amazon.com/blogs/devops/align-with-best-practices-while-creating-infrastructure-using-cdk-aspects/)
  * [Recommended AWS CDK project structure for Python applications](https://aws.amazon.com/blogs/developer/recommended-aws-cdk-project-structure-for-python-applications/)
  * [Best practices for discoverability of a construct library on Construct Hub](https://aws.amazon.com/blogs/opensource/best-practices-for-discoverability-of-a-construct-library-on-construct-hub/)
* [All developer blog posts about AWS CDK](https://aws.amazon.com/blogs/developer/category/developer-tools/aws-cloud-development-kit/)
* **[CDK Construction Zone](https://www.twitch.tv/collections/9kCOGphNZBYVdA)** - A Twitch live coding series hosted by the CDK team, season one episodes:
  * Triggers: Join us as we implement [Triggers](https://github.com/aws/aws-cdk-rfcs/issues/71), a Construct for configuring deploy time actions. Episodes 1-3:
    * [S1E1](https://www.twitch.tv/videos/917691798): Triggers (part 1); **Participants:** @NetaNir, @eladb, @richardhboyd
    * [S1E2](https://www.twitch.tv/videos/925801382): Triggers (part 2); **Participants:** @NetaNir, @eladb, @iliapolo 
    * [S1E3](https://www.twitch.tv/videos/944565768): Triggers (part 3); **Participants:** @NetaNir, @eladb, @iliapolo, @RomainMuller
  * [S1E4](https://www.twitch.tv/aws/video/960287598): [Tokens](https://docs.aws.amazon.com/cdk/latest/guide/tokens.html) Deep Dive; **Participants:** @NetaNir,@rix0rrr, @iliapolo, @RomainMuller
  * [S1E5](https://www.twitch.tv/videos/981481112): [Assets](https://docs.aws.amazon.com/cdk/latest/guide/assets.html) Deep Dive; **Participants:** @NetaNir, @eladb, @jogold
  * [S1E6](https://www.twitch.tv/aws/video/1005334364): [Best Practices](https://aws.amazon.com/blogs/devops/best-practices-for-developing-cloud-applications-with-aws-cdk/); **Participants:** @skinny85, @eladb, @rix0rrr, @alexpulver
  * [S1E7](https://www.twitch.tv/videos/1019059654): Tips and Tricks From The CDK Team; **Participants:** All the CDK team! 
* [Examples](https://github.com/aws-samples/aws-cdk-examples)
* [Changelog](./CHANGELOG.md)
* [NOTICE](./NOTICE)
* [License](./LICENSE)

