---
layout: post
title:  "Thoughts On Cloud Compatibility"
date:   2020-02-21 01:00:00 -0500
categories: compatibility open-source
---
I've spent the last couple years thinking about the topic of cross cloud
compatibility.  Besides just thinking about it and keeping my eyes open, I spent
three months working on [Cloudless](https://getcloudless.com/), and then spent
four months working on the same problem from [another direction]({% post_url
2019-12-13-butter-days-17 %}) for about 20% of my working time.

At this point, I've come up with my own theories and mental model for portable
infrastructure, so I thought it would be worth summarizing.

<hr>
<br>

## Not A Commodity

> In economics, a commodity is an economic good or service that has full or
> substantial fungibility: that is, the market treats instances of the good as
> equivalent or nearly so with no regard to who produced them.

This will be no shock to hear, but the cloud providers are not compatible.
There is no one standardized library or API to interact with all the cloud
providers.

This is the point.  Cloud providers all want to be "special".  They don't want
hardware to be a commodity because if hardware is a commodity they have to
compete on price and performance.  If they're "special" they can compete on
lock-in and software that they run as a service (and charge a premium for).

You don't have to look far to see this.  Consider one of the most basic building
blocks of cloud services: a single virtual machine.  In AWS if you want a
virtual machine you don't ask for "a virtual machine running Linux".  Instead,
you ask for an "EC2 Instance".

Does this really matter?  Well, I think so.  It's Amazon's way of telling the
world that their virtual machines are not a commodity, they are branded product
offerings.  That doesn't just make it into marketing, it also permeates all the
[client
libraries](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/ec2.html),
so even our code now has to acknowledge the branding.  There are even [pages
dedicated to mapping the different
terms to what they actually are](https://cloud.google.com/docs/compare/aws).

I think this is a huge gap, but the question I've been asking for the past few
years has been: Why isn't anyone doing anything about this?

## What Are Our Options?

At this point, I think there are three main ways to deal with this problem:

### 1. Hide It Behind Software

The first way, which I think is the most straightforward, is just to build an
entirely new platform that works on all cloud providers.  This is the approach
taken by things like [Cloud Foundry](https://www.cloudfoundry.org/),
[Kubernetes](https://kubernetes.io/), and [Serverless](https://serverless.com/).
They are all new abstractions that hide any details that might be cloud provider
specific, so that once you've written your infrastructure to work with them you
are effectively "portable".

This has the added benefit of creating a piece of software that people who want
portability are dependent on.  Because the underlying problems of
incompatibility haven't been solved, you have to use something like this if you
want cloud portability.

This has a very important result: you now have something you can sell.  This
make's Google's decision to go all in on Kubernetes make even more sense.  They
basically built a new cloud provider that can run on the other cloud providers
(and bare metal, it doesn't care).

### 2. Re-Implement A Cloud Provider API

Another approach is to just pick one of the proprietary APIs and stadardize
around that.  In fact, you can see this with many object stores providing an
[Amazon S3](https://docs.ceph.com/docs/mimic/radosgw/s3/) interface.

The [Eucalyptus
project](https://en.wikipedia.org/wiki/Eucalyptus_%28software%29) was a project
that attempted to reimplement the AWS API.  [It didn't go very
well](https://en.wikipedia.org/wiki/Eucalyptus_%28software%29#History).  I don't
know why exactly, but I suspect the effort of keeping up and maintaining
compatibility was just too high.

### 3. Create A Low Level Mapper

A third approach, which (full disclaimer) is the one I've been trying to
implement, is to create some kind of abstraction that is still low level but in
effect "compiles" down to the cloud providers.

[Apache Libcloud](https://libcloud.readthedocs.io/en/latest/index.html) and
[CloudBridge](https://github.com/CloudVE/cloudbridge) are valiant attempts at
making cloud independent client libraries.  They do their best to hide the
mapping behind a generic python API.  (many thanks especially to Apache Libcloud
for helping make [Cloudless](https://getcloudless.com/) possible)

Unfortunately, this is an uphill battle, and I think the above libraries have
the problem of having the "mapping" baked into python.  They will always
struggle to keep up, and none of that hard work will translate to other
languages.  This mapping has to be somewhere, and I think we have to find the
right way to represent it.

This is in part inspired by [LLVM](https://llvm.org/), a compiler toolchain that
created a standardized intermediate representation in the compilation path from
source to binary.  This allowed for a lot of new developments in programming
languages, because you could write a compiler that targeted the standard
intermediate representation and didn't have to worry about targeting every
hardware architecture.

> As an aside, I know the
> [JVM](https://en.wikipedia.org/wiki/Java_virtual_machine) existed already, but
> that's still a specific platform.  There were even [actual
> machines](https://en.wikipedia.org/wiki/Java_processor) that ran compiled java
> bytecode natively.

I don't know if this is possible to be honest.  But I've seen this theme over
and over again throughout my career, where a new abstraction opens up new
possibilities, especially when it's directly targeting the problem (as opposed
to packaging it as a new product).

> As an example, something like [kops](https://github.com/kubernetes/kops) could
> be built on this abstraction, for those who know what that is.

### Honorable Mention: Let The User Deal With It

Another approach, taken by projects like [Terraform](https://www.terraform.io/)
and [Ansible](https://docs.ansible.com/ansible/latest/modules/ec2_module.html)
for example, is to provide a tool that doesn't hide any of the underlying
differences between the cloud providers.  They make some aspect of interacting
with cloud providers easier, but otherwise just copy every single service
directly.

You still interact with s3 and ec2 when working with AWS, and you still interact
with object storage and virtual machines when working with Google Cloud.  You
have a helpful tool, but you still have to implement your infrastructure from
scratch for every cloud.

## So What's Next?

Based on what I've seen so far, I think we're more likely to get more of the
first option.  Everyone wants to be the entry point, because that's where the
stickiness is.  Many companies that I saw at conferences that claimed to solve
this problem started with "using our cross cloud management portal...".

I honestly think this just comes down to money.  You can sell a product if your
users can't do it themselves, but if you have an open standard that's easy to
build against, your product doesn't have the same defensibility.  Companies are
solving the cloud portability problem by building new products on top of the
mess that's already there.

I'm planning to keep looking for a way to do some kind of actual mapping, if
only because I want to know whether it's even possible (or feasible).  I'm
stopping work on [Cloudless](https://getcloudless.com/), since it was a decent
proof of concept but very limited.  I want to keep going on what I've been
calling [Butter Days]({% post_url 2019-12-13-butter-days-17 %}), which so far
has been about trying to find a way to turn this into a data mapping problem.
See that link for a summary of what I have so far.

Anyway, I hope this was interesting to someone out there.  Thanks for reading!
If you're interested in cloud portability, feel free to [send me an
email](mailto:cloudcompatibilityblogpost@shaunverch.com).  I don't get tired of
talking about this.
