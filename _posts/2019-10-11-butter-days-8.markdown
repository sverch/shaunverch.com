---
layout: post
title:  "Butter Days: Day 8"
date:   2019-10-11 01:00:00 -0500
categories: butter open-source
---
This is Day 8 of [Butter Days]({% post_url 2019-10-04-butter-days-7 %}), from
Badfish Coffee and Tea in Orangevale, CA.

Last week I got started writing a proxy in Rust that would add the proper
signature headers to an AWS request, so that I could hide the non-standardness
of its signing process and write everything else using good standards.

First I ran the
[`simple_proxy`](https://docs.rs/simple_proxy/1.2.1/simple_proxy/) crate to see
if I could rewrite headers, and then I copied the [unit
tests](https://github.com/okigan/awscurl/pull/69) that I wrote for the awscurl
project.

This week, my goal is to finish that proxy and send my first request!

See [Day 1 of Butter Days]({% post_url 2019-08-23-butter-days-1 %}) for context
on what I'm ultimately trying to build.

<hr>
<br>

## The Story So Far

Last week I was able to only finish one of the four functions, but I actually
finished the rest off screen the next day.

Here it is in all its glory.  It's a mess but it passes the tests, which is all
I'm aiming for at the moment!  Because the whole file is pretty big I'm just
going to paste the top level function and you can check the [pull
request](https://github.com/sverch/aws-signature-proxy/pull/1) that I'll put up
if you want to see all the code.

```rust
pub fn generate_aws_signature_headers(
    query: String,
    headers: HashMap<String, String>,
    port: Option<u16>,
    host: String,
    amzdate: String,
    method: String,
    data: Vec<u8>,
    security_token: Option<String>,
    data_binary: bool,
    datestamp: String,
    service: String,
    region: String,
    access_key: String,
    secret_key: String,
    canonical_uri: String) -> HashMap<String, String> {
    let (canonical_request,
         payload_hash,
         signed_headers) = task_1_create_a_canonical_request(
         query, headers, port, host, amzdate.clone(), method, data,
         security_token.clone(), data_binary, canonical_uri);
    let (string_to_sign,
         algorithm,
         credential_scope) = task_2_create_the_string_to_sign(
         amzdate.clone(), datestamp.clone(), canonical_request, service.clone(),
         region.clone());
    let signature = task_3_calculate_the_signature(
        datestamp, string_to_sign, service, region, secret_key);
    let new_headers = task_4_build_auth_headers_for_the_request(
        amzdate, payload_hash, algorithm, credential_scope, signed_headers,
        signature, access_key, security_token);
    return new_headers;
}
```

The next step is to understand how I can add new headers using the
`simple_proxy` library, and hook all this up!

## Adding Headers

I'm going to copy an [existing
middleware](https://github.com/terry90/rs-simple-proxy/blob/master/src/middlewares/cors.rs)
and see if I can figure out how to change it to add my arbitrary headers.

Most of my programming experience with rust has been doing whatever the compiler
tells me to do.  I've had very few real errors once I get rid of all the
compiler errors.  Let's see if that's the case here.

Wow, the hyper library has inline examples!

```rust
/// Returns a mutable reference to the associated header field map.
///
/// # Examples
///
/// ```
/// # use http::*;
/// # use http::header::*;
/// let mut request: Request<()> = Request::default();
/// request.headers_mut().insert(HOST, HeaderValue::from_static("world"));
/// assert!(!request.headers().is_empty());
/// ```
#[inline]
pub fn headers_mut(&mut self) -> &mut HeaderMap<HeaderValue> {
    &mut self.head.headers
}
```

After gutting one of the other middlewares (and of course satisfying the all
knowing compiler), I ended up with this.

```rust
pub struct AwsSignatureHeaders {}

impl AwsSignatureHeaders {
    pub fn new() -> Self {
        AwsSignatureHeaders{}
    }
}

impl Middleware for AwsSignatureHeaders {
    fn name() -> String {
        String::from("AwsSignatureHeaders")
    }

    fn before_request(
        &mut self,
        req: &mut Request<Body>,
        _context: &ServiceContext,
        _state: &State,
    ) -> Result<MiddlewareResult, MiddlewareError> {
        req.headers_mut().insert("foo", HeaderValue::from_static("bar"));
        Ok(Next)
    }
}
```

Let's see if that works using the echo endpoint we used before.

```
$ http_proxy=localhost:8080 curl -s http://postman-echo.com/get | jq
{
  "args": {},
  "headers": {
    "x-forwarded-proto": "https",
    "host": "postman-echo.com",
    "accept": "*/*",
    "foo": "bar",
    "proxy-connection": "Keep-Alive",
    "user-agent": "curl/7.59.0",
    "x-forwarded-port": "80"
  },
  "url": "https://postman-echo.com/get"
}
```

Nice!  This is starting to look good.  Now let's add our signature headers.

## Signing The Request

At this point, I spent a lot of time banging on type conversions, and learning
about how to actually set headers in hyper.

One difference that tripped me up is that they don't let you set the header name
from a dynamic string, but I'm returning a hash map of dynamic strings from my
signing function to represent the headers.  Ultimately that's a deliberate
choice made by the library maintainers so that we get [static type
checking](https://docs.rs/hyper/0.11.2/hyper/header/index.html#defining-custom-headers).
Those docs are old though, and they took any mention of it out of the docs in
[recent
versions](https://docs.rs/hyper/0.13.0-alpha.4/hyper/header/index.html#headername),
but it's fun to know why they did it.

Ultimately, this was easy to fix.  I just defined the custom AWS headers as
static strings, following the library's example.

```rust
const XAMZCONTENTSHA256: &str = "x-amz-content-sha256";
const XAMZSECURITYTOKEN: &str = "x-amz-security-token";
const XAMZDATE: &str = "x-amz-date";
```

Then I called `aws_signature_builder::generate_aws_signature_headers` to get my
new headers and ended up with lines that looked like this:

```rust
if new_headers.contains_key(XAMZCONTENTSHA256) {
    req.headers_mut().insert(XAMZCONTENTSHA256,
        HeaderValue::from_str(&new_headers[XAMZCONTENTSHA256]).unwrap());
}
```

This is so close...  The headers are being set, the signature is being
generated, and the tests are all passing.

At this point, I got impatient.  I wanted to know the real answer to "will this
even work".  So, I cheated and hard coded my secret key and a bunch of other
arguments to the signature generation.  After that, I started the proxy, and ran
this:

```
$ http_proxy=localhost:8080 curl -s "http://ec2.amazonaws.com?Action=DescribeInstances&Version=2013-10-15" 
<?xml version="1.0" encoding="UTF-8"?>
<DescribeInstancesResponse xmlns="http://ec2.amazonaws.com/doc/2013-10-15/">
    <requestId>2f102ce1-63d6-4f54-8b4e-18e93b4e8693</requestId>
    <reservationSet>
                    ...
                    <tagSet>
                        <item>
                            <key>aws:autoscaling:groupName</key>
                            <value>cloudless.consul-1</value>
                        </item>
                    </tagSet>
                    ...
    </reservationSet>
</DescribeInstancesResponse>
```

It's... alive!  That's definitely my instance.  I almost can't believe it
was that easy.  Unit tests are amazing.

All that's left now is a bunch of random cleanup, like not hard coding my secret
keys and finding a good way to force the proxy to talk https to Amazon, but this
is it!  I wonder how many people have gotten results back from the Amazon API
using a regular old `curl` command.

This is actually great, I just want to play around with it.  Check it out:

```
$ http_proxy=localhost:8080 curl -s \
    "http://ec2.amazonaws.com?Action=DescribeInstances&Version=2013-10-15" \
    | xq .DescribeInstancesResponse.reservationSet.item[].instancesSet[].tagSet
{
  "item": {
    "key": "aws:autoscaling:groupName",
    "value": "cloudless.web-cd7e33a"
  }
}
{
  "item": {
    "key": "aws:autoscaling:groupName",
    "value": "cloudless.consul-1"
  }
}
```

Here I'm filtering the output using the beautiful [`xq`
command](https://github.com/kislyuk/yq), which is a simple but amazing command
line xml parser based on `jq`.

## [Anything Is Possible](https://html5zombo.com/)

If I can actually use this to talk to AWS using a real OpenAPI spec, that opens
up a huge range of possibilities.  Here are some examples:

- [We can auto generate a CLI for
  AWS](https://github.com/danielgtaylor/openapi-cli-generator), to replace the
  [crazy AWS CLI](https://ilya-sher.org/2018/03/31/how-fucked-is-aws-cli-api/).
- We can [generate a client library in any
  language](https://github.com/OpenAPITools/openapi-generator/).
- We can generate a bunch of other code that uses the autogenerated client
  library to do things like import/export (this is what I want to use it for in
  this project).

I don't want to oversell it, because there can always be challenges, but if this
works, it will be something.

## Cleaning Up

Now I'm trying to stop hard coding things, so I'm using the [rusoto
credential](https://crates.io/crates/rusoto_credential) library to load my
credentials.

I hit an issue where I was calling a method that I could see was implemented,
but I was getting errors that the method wasn't defined and didn't have any idea
why.  Yet again, the compiler comes to the rescue:

```
 $ cargo build
   Compiling aws-signature-proxy v0.1.0 (/home/sverch/projects/aws-signature-proxy)
error[E0599]: no method named `credentials` found for type `rusoto_credential::DefaultCredentialsProvider` in the current scope
  --> src/main.rs:61:36
   |
61 |         let credentials = provider.credentials().wait().unwrap();
   |                                    ^^^^^^^^^^^
   |
   = help: items from traits can only be used if the trait is in scope
help: the following trait is implemented but not in scope, perhaps add a `use` for it:
   |
5  | use rusoto_credential::ProvideAwsCredentials;
   |

error: aborting due to previous error

For more information about this error, try `rustc --explain E0599`.
error: Could not compile `aws-signature-proxy`.

To learn more, run the command again with --verbose.
```

This is the most helpful compiler I've ever used in my life.  Of course, just
listening to exactly what the compiler was telling me to do fixed the problem.

After integrating that, all my normal AWS credential configuration methods
worked no problem!  I was looking for a way to get the region from my profile as
well, but looks like [it's not implemented
yet](https://github.com/rusoto/rusoto/issues/1120).  Maybe at some point I can
contribute to that, but for now I'll just work around it and not bother loading
the region in the normal way.

As for using https, I know I want to do that, but I might have to do it next
time.  I realized that unlike with http where I can intercept traffic and change
whatever I want, when I'm using https I actually have to terminate the
connection and man in the middle.  Now that I've done this, maybe I can use
[this proxy that says it does
that](https://github.com/nlevitt/monie/blob/master/examples/add-via.rs).  This
is why I need a man in the middle proxy:

```
$ http_proxy=localhost:8080 curl -s "https://ec2.amazonaws.com?Action=DescribeInstances&Version=2013-10-15" | xq .
{
  "Response": {
    "Errors": {
      "Error": {
        "Code": "MissingParameter",
        "Message": "The request must contain the parameter AWSAccessKeyId"
      }
    },
    "RequestID": "b9cdc176-4f60-42db-aca7-a8290732a377"
  }
}
```

My proxy can't change the headers if I'm using https, which makes sense.  That's
the whole point.

Now that the cleanup is all done, here's the [first pull
request](https://github.com/sverch/aws-signature-proxy/pull/1) for the
`aws-signature-proxy`!

## Now What?

This was one of the big things preventing me from auto generating the client.
Now that I've gotten this working (except for the https support, which I need),
I can pop back up to my original goal of dumping IAM information in such a way
that makes it easier to detect misconfigurations.

I'm also not currently able to get IAM information using my proxy, which awscurl
of course (the real MVP) helped me confirm was because of the lack of https
support:

```
$ awscurl --service iam 'http://iam.amazonaws.com?Action=ListUsers&Version=2010-05-08'
...
requests.exceptions.ConnectionError: HTTPConnectionPool(host='iam.amazonaws.com', port=80): Max retries exceeded with url: /?Action=ListUsers&Version=2010-05-08 (Caused by NewConnectionError('<urllib3.connection.HTTPConnection object at 0x7f417a0ca950>: Failed to establish a new connection: [Errno 111] Connection refused',))

$ awscurl --service iam 'https://iam.amazonaws.com?Action=ListUsers&Version=2010-05-08'
(returns my iam users)
```

This means that next time my goal is to add https support, and if I have time I
want to start doing more interesting things with it, like generating a CLI tool
or an export tool.

Thanks for reading!  Feedback and issues are appreciated on that project.
