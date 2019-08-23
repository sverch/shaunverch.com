---
layout: post
title:  "Butter Days: Day 1"
date:   2019-08-23 15:00:00 -0500
categories: butter open-source
---
First of all if you haven't read ["You Can Negotiate a 3-Day
Weekend"](https://codewithoutrules.com/3dayweekend/), I'd highly recommend it.
That blog is also just great in general.

For the first time, I've worked out an agreement where I'm working 4/5 of full
time at my current job.  This means that in theory I can spend Fridays working
on my own projects, at least when there's not something urgent going on.

I'm going to try to write about what I end up doing each week, because I
realized I'm going to be writing it down anyway to keep my thoughts straight.
Might as well turn it into a post while I'm at it.

<hr>
<br>

## IAM and Open Policy Agent

I recently learned about [Open Policy Agent](https://www.openpolicyagent.org/),
which is a tool that takes a set of policies, a set of examples, and tells you
whether your examples violate any of your policies.  It seems pretty
straighforward and self contained.

I've also spend a lot of time dealing with [AWS Identity and Access Management
(IAM)](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html), and
it's not always clear that all my policies are configured correctly.

So the idea is, why not make something that [exports from IAM and feeds that
into Open Policy Agent](https://github.com/sverch/iam-enforcer/issues/1).  Then
you could write high level policy definitions that alert you if something is
misconfigured.

To give some examples of questions I might want to know the answers to:

- Are any of my s3 buckets publicly accessible?
- Am I giving admin permissions to any of my ec2 instances?
- Do too many people have full admin access?

How would you answer those now?  I can't think of an easy way, so this seems
like it could be useful.  If I do it right it could probably work on multiple
clouds too.

## Exporting IAM Information

I could export this information in any number of ways.  I could use the [AWS
Command Line Tool](https://docs.aws.amazon.com/cli/latest/reference/iam/) an
[AWS specific library for whatever language I'm
using](https://aws.amazon.com/sdk-for-python/), or some kind of [cross cloud
library](https://libcloud.apache.org/).

Those would all technically work, but I'm going to try using the underlying REST
API all those tools are based on.  I'm hoping that by using the openapi
definitions directly (which some [awesome open source people put up on
github](https://github.com/APIs-guru/openapi-directory/tree/master/APIs/)) I can
automatically generate the "schema" of the objects I'm exporting and applying
the policies to.  I also hope that if I get the machinery for generating a
client based on those definitions right it will make it easier to support other
cloud providers.

## AWS API Authentication

Amazon has a product for creating REST APIs in front of things, so it's
difficult to search for this stuff (for example "openapi aws authentication"
doesn't return anything useful, just a bunch of results on that specific
product).

Since there are already libraries in most languages that can [dynamically
generate a client based on an openapi
specification](https://github.com/pyopenapi/pyswagger), I think the difficulty
in getting this working will be authentication.

To authenticate with AWS, you must [calculate a
signature](https://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html)
and send that signature in a specific header.  The [OpenAPI specification
includes an authentication
section](https://swagger.io/docs/specification/authentication/) and there seems
to be an
[`X-Amz-Signature`](https://github.com/APIs-guru/openapi-directory/blob/master/APIs/amazonaws.com/iam/2010-05-08/swagger.yaml)
parameter in the OpenAPI definition, but I think the actual signature generation
is specific to AWS and not something that will just work using standard OpenAPI
clients.

Fortunately, someone has already made a "curl for AWS" tool called
["awscurl"](https://github.com/okigan/awscurl) that generates the signature and
properly sets it in your request.  I tried it out and it works!  So now we have
some working code that uses the AWS rest API, which is a great situation.

## Hooking It Together

What I ultimately want is a library that can read an OpenAPI specification and
generate a client that I can use with AWS.  It seems like such a thing should
exist, but I couldn't find anything.

To do this, I think I need two things:

1. A library that can read OpenAPI specifications and return a client.
2. Something to generate the right headers for this library.

I'm going to try using [Rust](https://www.rust-lang.org/) for this, mostly
because I want to learn Rust, but also because I've heard good things about it
and I think it might be a good choice here.

The Rust AWS library is [rusoto](https://github.com/rusoto/rusoto), and it looks
like the [`rusoto_credential`](https://lib.rs/crates/rusoto_credential) library
that loads AWS credentials is in a separate package.

Rust has a [library that can read and write OpenAPI
specifications](https://docs.rs/openapi/0.1.5/openapi/), and I might be able to
use this [OpenAPI code
generator](https://github.com/OpenAPITools/openapi-generator) to generate the
Rust client.  I'm not sure yet if that library can only generate the server code
though, so there might still be more work there.

I couldn't find anything like
[pyswagger](https://github.com/pyopenapi/pyswagger) for Rust unfortunately.
That library just reads the specification and returns a client object that works
with the api defined by the spec, instead of requiring you to generate a bunch
of code.

Rust has a [rest client though](https://github.com/spietika/restson-rust), so if
I end up doing this I might end up using that client.  At the very least I can
use it to test whether I've generated my signature correctly.

## Next Time

That's all I have time for today, but next time hopefully I can get a basic
client working.  This will probably involve:

- Trying out the [Rust rest client](https://github.com/spietika/restson-rust)
  and connecting to a simple unauthenticated API to get a sense of how to use
  it.
- Porting the parts of ["awscurl"](https://github.com/okigan/awscurl) that
  generate the [correct
  headers](https://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html)
  to Rust.
- Trying the Rust rest client with the right headers to see if I can get even
  one request working.
- Using the Rust [openapi library](https://docs.rs/openapi/0.1.5/openapi/) to
  read the [IAM OpenAPI
  Spec](https://github.com/APIs-guru/openapi-directory/blob/master/APIs/amazonaws.com/iam/2010-05-08/swagger.yaml).
- Trying the [OpenAPI code
  generator](https://github.com/OpenAPITools/openapi-generator) to see if it can
  generate a Rust client.
- Trying to make a Rust object that is dynamically generated based on the
  OpenAPI definition.  I don't know if this is possible in Rust, and this may
  not be a very Rust thing to do even if it is.
