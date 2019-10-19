---
layout: post
title:  "Butter Days: Day 9"
date:   2019-10-18 01:00:00 -0500
categories: butter open-source
---
This is Day 9 of [Butter Days]({% post_url 2019-10-11-butter-days-8 %}), from
Bellachino's Cafe in Chico, CA.

Last week I wrote a proxy in rust to add the AWS signatures and proved it worked
by using unmodified `curl` to get data from my account.

That's great and all, but my proxy currently only works with `http` and not
`https`, which is a non starter.  This week I'm going to try to convert it into
a man in the middle proxy using [this
library](https://github.com/nlevitt/monie).

See [Day 1 of Butter Days]({% post_url 2019-08-23-butter-days-1 %}) for context
on what I'm ultimately trying to build.

<hr>
<br>

## Why I Need This

When you're using `http`, all requests are sent completely out in the open, with
no encryption or validation whatsoever.  That's why, with the simple
pass-through proxy I used last time, I could arbitrarily view and modify the
request on its way to AWS.

`https` not only encrypts all requests, providing confidentiality, but it also
checks [integrity and authenticity](https://https.cio.gov/faq) so you know that
the request wasn't tampered with and that it's going to the right person.

What that means for us is that we can no longer modify the headers unless we
terminate the secure connection from the client and then create a new connection
to our ultimate destination.  This is known as ["man in the
middle"](https://en.wikipedia.org/wiki/Man-in-the-middle_attack), usually in the
context of an attack, but in this case we're going to use it to man in the
middle ourselves.

In general I'm not a fan of breaking security guarantees, but in this case I
think we can really lock it down locally.  Plus, as discussed in a [previous
post]({% post_url 2019-09-27-butter-days-6 %}), despite the obvious trade-offs I
still think this is the right approach.

## Show Me The Monie

I'm going to use this [man in the middle proxy
library](https://github.com/nlevitt/monie) called `monie` to replace the
`simple_proxy` library.  It's a random project that doesn't seem that actively
supported, and I don't think it's in the rust package directory, but I'm in "get
it working" mode right now, so I'll give it a try anyway.

First, let's add this to my `Cargo.toml`:

```toml
monie = { git = "https://github.com/nlevitt/monie" }
```

I had to use the github link because there's not a published crate for it.
Although in searching for it I found a crate that [looks like the result of
someone's PhD thesis](https://crates.io/crates/schnorrkel).

When I try to build, I hit all these errors:

```

$ cargo build
   Compiling monie v0.1.0 (https://github.com/nlevitt/monie#6f406364)
error[E0603]: module `pool` is private
  --> /home/sverch/.cargo/git/checkouts/monie-1f736930668e71b3/6f40636/src/lib.rs:55:20
   |
55 | use hyper::client::pool::Pooled;
   |                    ^^^^

error[E0603]: struct `PoolClient` is private
  --> /home/sverch/.cargo/git/checkouts/monie-1f736930668e71b3/6f40636/src/lib.rs:56:36
   |
56 | use hyper::client::{HttpConnector, PoolClient};
   |                                    ^^^^^^^^^^

error[E0624]: method `connection_for` is private
   --> /home/sverch/.cargo/git/checkouts/monie-1f736930668e71b3/6f40636/src/lib.rs:166:25
    |
166 |     let result = CLIENT.connection_for(uri, key1).map_err(move |e| {
    |                         ^^^^^^^^^^^^^^

error[E0282]: type annotations needed
   --> /home/sverch/.cargo/git/checkouts/monie-1f736930668e71b3/6f40636/src/lib.rs:186:15
    |
186 |         .map(|mut connection| {
    |               ^^^^^^^^^^^^^^ consider giving this closure parameter a type
    |
    = note: type must be known at this point

error: aborting due to 4 previous errors

Some errors have detailed explanations: E0282, E0603, E0624.
For more information about an error, try `rustc --explain E0282`.
error: Could not compile `monie`.

To learn more, run the command again with --verbose.
```

Looking at the [Cargo.toml for that
project](https://github.com/nlevitt/monie/blob/master/Cargo.toml), I see this
section:

```
[patch.crates-io]
"hyper" = { git = "https://github.com/nlevitt/hyper", branch = "pub-pool" }
```

Looks like he's actually patching the hyper library to expose the things he
needed for the proxy that are normally private to the library.  Let's try
building the library on its own to see if we can reproduce the issue:

```
$ git clone https://github.com/nlevitt/monie
$ cd monie/
$ cargo build
...
    Finished dev [unoptimized + debuginfo] target(s) in 19.97s
```

Well that worked, but I think it's because the `Cargo.lock` file is still
pointing to all the versions that this person built with originally.  Let's see
what happens if I do [`cargo
update`](https://doc.rust-lang.org/cargo/commands/cargo-update.html).


```
warning: Patch `hyper v0.12.31
(https://github.com/nlevitt/hyper?branch=pub-pool#802d1088)` was not used in the
crate graph.
Check that the patched package version and available features are compatible
with the dependency requirements. If the patch has a different version from
what is locked in the Cargo.lock file, run `cargo update` to use the new
version. This may also occur with an optional dependency that is not enabled.
```

This shows that the branch that's getting pulled in as a patch is incompatible
with the most recent hyper version.  I think all I have to do is update that
branch to a more recent version, a theory that is supported by [this
commit](https://github.com/nlevitt/monie/commit/6f4063645680b023e81f108eccc17eef984c9d0c)
which doesn't change the patch branch at all and is called "fix up hyper patched
dependency".  Let's [fork](https://help.github.com/en/articles/fork-a-repo) that
[customized hyper repo](https://github.com/nlevitt/hyper).

```
$ git clone git@github.com:sverch/hyper.git
$ cd hyper/
# Following https://help.github.com/en/articles/syncing-a-fork to sync with
# latest hyper.
$ git checkout master
$ git remote add upstream https://github.com/hyperium/hyper.git
$ git fetch upstream
# Creating new branch for latest hyper version.
$ git checkout v0.12.35
$ git checkout -b 0.12.35-pubpool
$ git cherry-pick -x pub-pool
$ git push origin 0.12.35-pubpool
```

Now let's try it in my project:

```toml
"hyper" = { git = "https://github.com/sverch/hyper", branch = "0.12.35-pubpool" }
```

It works!

```
$ cargo build
    Updating git repository `https://github.com/sverch/hyper`
   Compiling hyper v0.12.35 (https://github.com/sverch/hyper?branch=0.12.35-pubpool#d3b8b241)
   Compiling hyper-rustls v0.15.1
   Compiling simple_proxy v1.2.1
   Compiling rusoto_credential v0.41.1
   Compiling monie v0.1.0 (https://github.com/nlevitt/monie#6f406364)
   Compiling aws-signature-proxy v0.1.0 (/home/sverch/projects/aws-signature-proxy)
    Finished dev [unoptimized + debuginfo] target(s) in 20.23s
```

## Replacing The Proxy

Now that I can actually build this library, let's try to make the replacement.
I'm going to look at the
[examples](https://github.com/nlevitt/monie/tree/master/examples) first to see
if I can get any of them running.

I copied the
[add-via.rs](https://github.com/nlevitt/monie/blob/master/examples/add-via.rs)
example and tried to run it.  After importing some libraries it worked great!  I
did some playing around and found that you need to set `https_proxy` and use
https in the URL.  If you only do one of those things, the headers won't get set
properly.  To verify that this is actually different from what I had before,
here's what happens on the old proxy:

```
 $ https_proxy=localhost:8080 curl --insecure --verbose https://postman-echo.com/get 
*   Trying ::1...
* TCP_NODELAY set
* connect to ::1 port 8080 failed: Connection refused
*   Trying 127.0.0.1...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 8080 (#0)
* allocate connect buffer!
* Establish HTTP proxy tunnel to postman-echo.com:443
> CONNECT postman-echo.com:443 HTTP/1.1
> Host: postman-echo.com:443
> User-Agent: curl/7.59.0
> Proxy-Connection: Keep-Alive
> 
* Proxy CONNECT aborted
* CONNECT phase completed!
* Connection #0 to host localhost left intact
curl: (56) Proxy CONNECT aborted
```

Here's the new proxy:

```
 $ https_proxy=localhost:8000 curl --insecure --verbose https://postman-echo.com/get | jq
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0*   Trying ::1...
* TCP_NODELAY set
* connect to ::1 port 8000 failed: Connection refused
*   Trying 127.0.0.1...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 8000 (#0)
* allocate connect buffer!
* Establish HTTP proxy tunnel to postman-echo.com:443
> CONNECT postman-echo.com:443 HTTP/1.1
> Host: postman-echo.com:443
> User-Agent: curl/7.59.0
> Proxy-Connection: Keep-Alive
> 
< HTTP/1.1 200 OK
< date: Fri, 18 Oct 2019 23:16:24 GMT
< 
* Proxy replied 200 to CONNECT request
* CONNECT phase completed!
* ALPN, offering h2
* ALPN, offering http/1.1
* ignoring certificate verify locations due to disabled peer verification
} [5 bytes data]
* TLSv1.2 (OUT), TLS handshake, Client hello (1):
} [512 bytes data]
* CONNECT phase completed!
* CONNECT phase completed!
{ [5 bytes data]
* TLSv1.2 (IN), TLS handshake, Server hello (2):
{ [89 bytes data]
* TLSv1.2 (IN), TLS handshake, Certificate (11):
{ [701 bytes data]
* TLSv1.2 (IN), TLS handshake, Server key exchange (12):
{ [300 bytes data]
* TLSv1.2 (IN), TLS handshake, Server finished (14):
{ [4 bytes data]
* TLSv1.2 (OUT), TLS handshake, Client key exchange (16):
} [37 bytes data]
* TLSv1.2 (OUT), TLS change cipher, Client hello (1):
} [1 bytes data]
* TLSv1.2 (OUT), TLS handshake, Finished (20):
} [16 bytes data]
* TLSv1.2 (IN), TLS handshake, Finished (20):
{ [16 bytes data]
* SSL connection using TLSv1.2 / ECDHE-RSA-AES256-GCM-SHA384
* ALPN, server did not agree to a protocol
* Server certificate:
*  subject: CN=postman-echo.com
*  start date: Oct 18 23:16:15 2019 GMT
*  expire date: Oct 17 23:16:15 2020 GMT
*  issuer: CN=postman-echo.com
*  SSL certificate verify result: self signed certificate (18), continuing anyway.
} [5 bytes data]
> GET /get HTTP/1.1
> Host: postman-echo.com
> User-Agent: curl/7.59.0
> Accept: */*
> 
{ [5 bytes data]
< HTTP/1.1 200 OK
< content-type: application/json; charset=utf-8
< date: Fri, 18 Oct 2019 23:16:25 GMT
< etag: W/"d7-Eldda86YB4G9tb5cNTQcIx254iQ"
< server: nginx
< set-cookie: sails.sid=s%3AuAJTxcFymrxpgdPtUuTw5BqpOeb7pPib.sOMi9NZJaIGevDf1zzhiZdUM%2BVChm74Y4IYAOfv5Cic; Path=/; HttpOnly
< vary: Accept-Encoding
< content-length: 215
< connection: keep-alive
< via: 1.1 monie-add-via-example
< 
  0   215    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0{ [5 bytes data]
100   215  100   215    0     0    265      0 --:--:-- --:--:-- --:--:--   264
* Connection #0 to host localhost left intact
{
  "args": {},
  "headers": {
    "x-forwarded-proto": "https",
    "host": "postman-echo.com",
    "accept": "*/*",
    "user-agent": "curl/7.59.0",
    "via": "1.1 monie-add-via-example",
    "x-forwarded-port": "443"
  },
  "url": "https://postman-echo.com/get"
}
```

Looks great!  That was easier than I expected.  Let's add in the signature logic
from the old proxy and see if we can bring this together.  Note that for now I'm
just passing `--insecure`, but eventually I want to add a certificate for
safety.  At the very least I should make sure to bind this proxy only to
localhost so that random people who I'm sharing a network with in a coffee shop
can't send requests to AWS posing as me.

## Proxying With Https

The rest of this was actually pretty straightforward.  I took the
[add-via.rs](https://github.com/nlevitt/monie/blob/master/examples/add-via.rs)
example that was working before and replaced the code that added the via headers
with my code that signs the request.  There was a little bit of type fixing as
usual, but the compiler made it obvious what I needed to change.

I couldn't figure out how to pass the region into this one, so I just hard coded
it for now.  So here's the moment of truth:

```
$ cargo run 8080
   Compiling aws-signature-proxy v0.1.0 (/home/sverch/projects/aws-signature-proxy)
    Finished dev [unoptimized + debuginfo] target(s) in 5.10s
     Running `target/debug/aws-signature-proxy 8080`
add-via mitm proxy listening on http://127.0.0.1:8080
```

Remember from [last time]({% post_url 2019-10-11-butter-days-8 %}) that one of
the requests I couldn't do without https was `ListUsers`.  Let's try that now
and see if it works:

```
$ https_proxy=localhost:8080 curl --insecure -s "https://iam.amazonaws.com?Action=ListUsers&Version=2010-05-08" | xq .
{
  "ListUsersResponse": {
    "@xmlns": "https://iam.amazonaws.com/doc/2010-05-08/",
    "ListUsersResult": {
      "IsTruncated": "false",
      "Users": {
        "member": {
          "Path": "/",
          "PasswordLastUsed": "2019-08-31T04:27:09Z",
          "UserName": "shaun.verch",
          "Arn": "arn:aws:iam::555555555555:user/shaun.verch",
          "UserId": "AAAAAAAAAAAAAAAAAAAAA",
          "CreateDate": "2017-09-26T21:42:46Z"
        }
      }
    },
    "ResponseMetadata": {
      "RequestId": "0a57e144-2faf-4ef7-8b9a-9cc8f3c5673b"
    }
  }
}
```

We got it!  We're now talking to the AWS API with https, which was the last
major piece missing from this proxy.  Here's the [pull
request](https://github.com/sverch/aws-signature-proxy/pull/2) for this change.

## Next Time

Now that we have this proxy done, I think it's time to move on to the actual
client generation.  I want to try to use the [AWS OpenAPI
specs](https://github.com/APIs-guru/openapi-directory/tree/master/APIs/amazonaws.com)
to generate a [command line
tool](https://github.com/danielgtaylor/openapi-cli-generator) and a [client
library](https://github.com/OpenAPITools/openapi-generator).  Maybe I can even
give [pyswagger](https://github.com/pyopenapi/pyswagger) a try.

Getting to the point where I can actually interact with the AWS API using
standard OpenAPI tools was the ultimate goal here.  Once I get that working, I
can start auto generating code that does more interesting things, like exporting
everything that an API exposes.

After that I'll probably write something that generates a "schema" based on an
OpenAPI spec.  That seems like it could be useful, if it's even possible, for
getting the state locked in an endpoint into an easier to interact with format.
