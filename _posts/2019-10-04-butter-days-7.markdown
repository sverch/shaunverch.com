---
layout: post
title:  "Butter Days: Day 7"
date:   2019-10-04 01:00:00 -0500
categories: butter open-source
---
This is Day 7 of [Butter Days]({% post_url 2019-09-27-butter-days-6 %}), from
Pleasant Grove Public Library in Pleasant Grove, Utah.

Last week I came to the conclusion that the AWS API signature was crazy and
nonstandard, and the best solution was to hide it behind something that exposes
a more OpenAPI compatible interface.

To achieve that, I'm going to try to write a [Proxy in
Rust](https://medium.com/swlh/writing-a-proxy-in-rust-and-why-it-is-the-language-of-the-future-265d8bf7c6d2)
that adds the proper AWS signatures to any AWS API request.

See [Day 1 of Butter Days]({% post_url 2019-08-23-butter-days-1 %}) for context
on what I'm ultimately trying to build.

<hr>
<br>

## A Headers Echo Endpoint

Before I get into it, I just found
[https://docs.postman-echo.com/](https://docs.postman-echo.com/), which I can
use to tell me what headers the server actually received.

```
$ curl https://postman-echo.com/get
{"args":{},"headers":{
    "x-forwarded-proto":"https",
    "host":"postman-echo.com",
    "accept":"*/*",
    "user-agent":"curl/7.59.0",
    "x-forwarded-port":"443"},
 "url":"https://postman-echo.com/get"}
```

That's going to be very useful, since my proxy's entire job will be to add extra
signature headers.

## A Basic Rust Proxy

I was going to try to follow [this blog
post](https://medium.com/swlh/writing-a-proxy-in-rust-and-why-it-is-the-language-of-the-future-265d8bf7c6d2)
to make the proxy, but from that post I found the
[`simple_proxy`](https://docs.rs/simple_proxy/1.2.1/simple_proxy/) crate, so
let's ditch the post and use the real docs for that instead.  Thanks for the SEO
random internet person.

I also looked briefly to see if the [`cargo
generate`](https://github.com/ashleygwilliams/cargo-generate) command had a
simple proxy template, but no luck.

[This is the github project](https://github.com/terry90/rs-simple-proxy) for the
`simple_proxy` crate, and there's some usage in the README.  Let's start by
copying that.

First, I'm going to start a new project for all of this, sticking with the CLI
template because I know I'll need command line options:

```
$ cargo generate --git https://github.com/rust-cli/cli-template.git --name aws-signature-proxy
 Creating project called `aws-signature-proxy`...
 Done! New project created /home/sverch/projects/aws-signature-proxy
```

I tried to install `simple_proxy` with `cargo install` instead of the way I've
done it before and ran into an issue:

```
$ cargo install simple_proxy
    Updating crates.io index
  Downloaded simple_proxy v1.2.1
  Downloaded 1 crate (11.1 KB) in 0.76s
error: specified package `simple_proxy v1.2.1` has no binaries
```

Looks like [that's expected](https://github.com/rust-lang/cargo/issues/3821) and
`cargo install` just doesn't do what I think it does.  I'll go back to my old
method of editing `Cargo.toml`:

```toml
[package]
name = "aws-signature-proxy"
version = "0.1.0"
authors = ["Shaun Verch"]
edition = "2018"

[dependencies]
structopt = "0.2"
simple_proxy = "1.2.1"
```

After that, everything installed as expected.  Now let's get to the actual code.
When I copy the [example in the `simple_proxy`
README](https://github.com/terry90/rs-simple-proxy), I get this error:

```
$ cargo run
   Compiling aws-signature-proxy v0.1.0 (/home/sverch/projects/aws-signature-proxy)
error[E0583]: file not found for module `middlewares`
 --> src/main.rs:3:5
  |
3 | mod middlewares;
  |     ^^^^^^^^^^^
  |
  = help: name the file either middlewares.rs or middlewares/mod.rs inside the directory "src"

error: aborting due to previous error

For more information about this error, try `rustc --explain E0583`.
error: Could not compile `aws-signature-proxy`.

To learn more, run the command again with --verbose.
```

I'm not sure why that's in the example, because it looks like `mod` is for
[declaring
modules](https://users.rust-lang.org/t/importing-module-from-another-module/18172)
rather than using them.

Looking through the [github
project](https://github.com/terry90/rs-simple-proxy), it also looks like the
paths are different from the example in the README, so I suspect that example
hasn't been updated after some breaking changes.  Time to figure out what the
real paths are.  I'll listen to the error messages and read what I think is the
[module
definition](https://github.com/terry90/rs-simple-proxy/blob/master/src/middlewares/mod.rs)
for the definitions I'm trying to import.

The first thing I notice is that none of the code actually contains any
reference to `auth`, but it's referenced in the README.  That middleware may
have either been deleted or never written.  Maybe the README was aspirational:

```
$ git grep -i auth
Cargo.toml:authors = ["Terry Raimondo <terry.raimondo@gmail.com>"]
LICENSE:      "Licensor" shall mean the copyright owner or entity authorized by
LICENSE:      "Work" shall mean the work of authorship, whether in Source or
LICENSE:      represent, as a whole, an original work of authorship. For the purposes
LICENSE:      "Contribution" shall mean any work of authorship, including
LICENSE:      or by an individual or Legal Entity authorized to submit on behalf of
README.md:use middlewares::auth::Auth;
README.md:    let auth = Auth::new(config.clone());
README.md:        "Content-Type, Accept, Authorization, X-Requested-Ids, X-Tenant",
README.md:    proxy.add_middleware(Box::new(auth));
src/middlewares/router.rs:    parts.authority = Some(host.parse()?);
```

I see other unresolved imports that are actually in the module definition file,
but aren't resolving.  In that same file, I see this:

```rust
#[cfg(feature = "cors")]
```

It looks like that's a [conditional compilation
attribute](https://doc.rust-lang.org/rust-by-example/attribute/cfg.html), and I
can specify those explicitly as something called ["features" in my
Cargo.toml](https://doc.rust-lang.org/cargo/reference/manifest.html#the-features-section).
Let's do that, just to see if it works:

```toml
simple_proxy = { version = "1.2.1", features = ["router", "health", "cors"] }
```

The unresolved imports went away after that, so that's cool.  The example is
rife with undefined variables, so I don't think this README example was ever
run, at least on its own.  After some work to resolve all the compiler errors,
this is what I ended up with:

```rust
extern crate simple_proxy;

use simple_proxy::middlewares::{Cors, Health, Logger};
use simple_proxy::{SimpleProxy, Environment};

use structopt::StructOpt;

#[derive(StructOpt, Debug)]
struct Cli {
    port: u16,
}

fn main() {
    let args = Cli::from_args();

    let mut proxy = SimpleProxy::new(args.port, Environment::Development);
    let health = Health::new("/health", "OK !");
    let logger = Logger::new();
    let cors = Cors::new(
        "*",
        "GET, POST, PATCH, DELETE, OPTIONS",
        "Content-Type, Accept, Authorization, X-Requested-Ids, X-Tenant",
    );

    // Order matters
    proxy.add_middleware(Box::new(logger));
    proxy.add_middleware(Box::new(cors));
    proxy.add_middleware(Box::new(health));

    // Start proxy
    proxy.run();
}
```

Let's try it out!  Running it on port 8080:

```
$ cargo run 8080
   Compiling aws-signature-proxy v0.1.0 (/home/sverch/projects/aws-signature-proxy)
    Finished dev [unoptimized + debuginfo] target(s) in 2.56s
     Running `target/debug/aws-signature-proxy 8080`
```

Now I can see what it does.  Running it without the proxy:

```
$ curl http://postman-echo.com/get
{"args":{},"headers":{
    "x-forwarded-proto":"https",
    "host":"postman-echo.com",
    "accept":"*/*",
    "user-agent":"curl/7.59.0",
    "x-forwarded-port":"80"},
 "url":"https://postman-echo.com/get"}
```

Running it with the proxy:

```
$ curl -x http://localhost:8080 http://postman-echo.com/get
{"args":{},"headers":{
    "x-forwarded-proto":"https",
    "host":"postman-echo.com",
    "accept":"*/*",
    "proxy-connection":"Keep-Alive",
    "user-agent":"curl/7.59.0",
    "x-forwarded-port":"80"},
 "url":"https://postman-echo.com/get"}
```

Great!  I see the proxy added the `proxy-connection` header.  That proves at
least that the headers can be modified.  I know I'll have to figure out how to
deal with https, but I can think about that later.

By the way, I ran the [`awscurl` command](https://github.com/okigan/awscurl) to
see what would happen if I just used `http`, and maybe the AWS API accepts it?

```
$ awscurl --service ec2 'http://ec2.amazonaws.com?Action=DescribeRegions&Version=2013-10-15'
<?xml version="1.0" encoding="UTF-8"?>
<DescribeRegionsResponse xmlns="http://ec2.amazonaws.com/doc/2013-10-15/">
...
```

Maybe this means the AWS API allows unencrypted http requests.  That's kind of
insane, but it explains why their signature process is so bizarre.  They're
actually sending that over unencrypted connections.  Well, this proxy won't
allow that, that's for sure.

## Signature Library

Now that I have a basic proxy running and know roughly how to add headers, I can
start writing the library that will generate those headers.  The final step will
be to plug in some middleware that calls this library and adds the resulting
headers to the request.

First, I'll copy the [unit tests](https://github.com/okigan/awscurl/pull/69)
that I wrote for `awscurl` a couple weeks ago into rust, and then I'll implement
the functions themselves.

## Rust Unit Testing

First I need to learn about [unit testing in
Rust](https://doc.rust-lang.org/rust-by-example/testing/unit_testing.html).  It
looks like the way it works is that I need to annotate functions with the `test`
attribute and then `cargo test` can find and run them.  From the examples in
those docs, I found that when I put this:

```rust
#[cfg(test)]
mod tests {
    // Note this useful idiom: importing names from outer (for mod tests) scope.
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(1, 2), 3);
    }
}
```

In `src/main.rs` cargo runs the tests, but it doesn't in a different file.  I
have a feeling this has to do with includes.  Rust probably knows that I'm using
`main.rs` but not the other file.  So let's start making our skeleton, and learn
a little bit about [rust
modules](https://doc.rust-lang.org/rust-by-example/mod.html).

Those are good docs, so I'm not going to retype them, but my big takeaway is
that `use mymodule;` will look for `mymodule.rs` or `mymodule/mod.rs` and import
them under the scope where the `use` keyword is found.  That's all I need.
Let's create `src/aws_signature_builder/mod.rs`.

```rust
pub fn task_1_create_a_canonical_request() {
    println!("task_1_create_a_canonical_request");
}
pub fn task_2_create_the_string_to_sign() {
    println!("task_2_create_the_string_to_sign");
}
pub fn task_3_calculate_the_signature() {
    println!("task_3_calculate_the_signature");
}
pub fn task_4_build_auth_headers_for_the_request() {
    println!("task_4_build_auth_headers_for_the_request");
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_task_1_create_a_canonical_request() {
        super::task_1_create_a_canonical_request();
    }

    #[test]
    fn test_task_2_create_the_string_to_sign() {
        super::task_2_create_the_string_to_sign();
    }

    #[test]
    fn test_task_3_calculate_the_signature() {
        super::task_3_calculate_the_signature();
    }

    #[test]
    fn test_task_4_build_auth_headers_for_the_request() {
        super::task_4_build_auth_headers_for_the_request();
    }
}
```

I copied these function names exactly from my [`awscurl` pull
request](https://github.com/okigan/awscurl/pull/69), because I'm also going to
copy the test examples.  Lets run these tests now:

```
 $ cargo test
   Compiling aws-signature-proxy v0.1.0 (/home/sverch/projects/aws-signature-proxy)
    Finished dev [unoptimized + debuginfo] target(s) in 0.59s
     Running target/debug/deps/aws_signature_proxy-c35fbbc809d3fc7e

running 4 tests
test aws_signature_builder::tests::test_task_2_create_the_string_to_sign ... ok
test aws_signature_builder::tests::test_task_3_calculate_the_signature ... ok
test aws_signature_builder::tests::test_task_4_build_auth_headers_for_the_request ... ok
test aws_signature_builder::tests::test_task_1_create_a_canonical_request ... ok

test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Great!  Now time to copy over the actual test case bodies, add arguments and
argument types, and replace all the python asserts with rust asserts.  The
function ended up looking like this:

```rust
pub fn task_1_create_a_canonical_request(
    query: String,
    headers: String,
    port: Option<u16>,
    host: String,
    amzdate: String,
    method: String,
    data: String,
    security_token: Option<String>,
    data_binary: bool,
    canonical_uri: String) -> (String, String, String) {
    let port_str = match port {
        Some(p) => p.to_string(),
        None => String::from("UNSET"),
    };
    let token_str = match security_token {
        Some(p) => p,
        None => String::from("UNSET"),
    };
    let result = format!(" {} {} {} {} {} {} {} {} {} {} ",
        query, headers, port_str, host, amzdate, method, data, token_str,
        data_binary, canonical_uri);
    println!("task_1_create_a_canonical_request");
    return (result, String::from("bar"), String::from("baz"))
}
```

And the test case looks like this:

```rust
#[test]
fn test_task_1_create_a_canonical_request() {
    let (canonical_request,
         payload_hash,
         signed_headers) = super::task_1_create_a_canonical_request(
        String::from("Action=DescribeInstances&Version=2013-10-15"),
        String::from("{'Content-Type': 'application/json', 'Accept': 'application/xml'}"),
        None,
        String::from("ec2.amazonaws.com"),
        String::from("20190921T022008Z"),
        String::from("GET"),
        String::from(""),
        None,
        false,
        String::from("/"));
    assert_eq!(canonical_request, "GET\n\
                     /\n\
                     Action=DescribeInstances&Version=2013-10-15\n\
                     host:ec2.amazonaws.com\n\
                     x-amz-date:20190921T022008Z\n\
                     \n\
                     host;x-amz-date\n\
                     e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    assert_eq!(payload_hash,
                     "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    assert_eq!(signed_headers, "host;x-amz-date");
}
```

Now I have a failing test!

```
 $ cargo test
   Compiling aws-signature-proxy v0.1.0 (/home/sverch/projects/aws-signature-proxy)
    Finished dev [unoptimized + debuginfo] target(s) in 1.53s
     Running target/debug/deps/aws_signature_proxy-c35fbbc809d3fc7e

running 4 tests
test aws_signature_builder::tests::test_task_3_calculate_the_signature ... ok
test aws_signature_builder::tests::test_task_4_build_auth_headers_for_the_request ... ok
test aws_signature_builder::tests::test_task_1_create_a_canonical_request ... FAILED
test aws_signature_builder::tests::test_task_2_create_the_string_to_sign ... ok

failures:

---- aws_signature_builder::tests::test_task_1_create_a_canonical_request stdout ----
task_1_create_a_canonical_request
thread 'aws_signature_builder::tests::test_task_1_create_a_canonical_request' panicked at 'assertion failed: `(left == right)`
  left: `" Action=DescribeInstances&Version=2013-10-15 {\'Content-Type\': \'application/json\', \'Accept\': \'application/xml\'} UNSET ec2.amazonaws.com 20190921T022008Z GET  UNSET false / "`,
 right: `"GET\n/\nAction=DescribeInstances&Version=2013-10-15\nhost:ec2.amazonaws.com\nx-amz-date:20190921T022008Z\n\nhost;x-amz-date\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"`', src/aws_signature_builder/mod.rs:63:9
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace.


failures:
    aws_signature_builder::tests::test_task_1_create_a_canonical_request

test result: FAILED. 3 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out

error: test failed, to rerun pass '--bin aws-signature-proxy'
```

## Porting Awscurl

Now that I actually have a failing test, I'm much more confident in porting the
signature logic in `awscurl` from Python to Rust.  I managed to complete one of
the four stages of the signing process, but unfortunately I'm out of time for
today.  Here's what stage one ended up looking like:

```rust
extern crate querystring;

use crypto::digest::Digest;
use crypto::sha2::Sha256;

use percent_encoding::{utf8_percent_encode, AsciiSet, CONTROLS};

use std::collections::HashMap;

/// https://url.spec.whatwg.org/#fragment-percent-encode-set
const FRAGMENT: &AsciiSet = &CONTROLS.add(b' ').add(b'"').add(b'<').add(b'>').add(b'`');

/// https://url.spec.whatwg.org/#path-percent-encode-set
const PATH: &AsciiSet = &FRAGMENT.add(b'#').add(b'?').add(b'{').add(b'}');

fn normalize_query_string(query: String) -> String {
    let mut query_pairs = querystring::querify(&query);
    query_pairs.sort_by(|a, b| a.0.cmp(&b.0));
    return String::from(querystring::stringify(query_pairs).trim_end_matches("&"));
}

/// ************* TASK 1: CREATE A CANONICAL REQUEST *************
/// http://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
///
/// Step 1 is to define the verb (GET, POST, etc.)--already done.
///
/// Step 2: Create canonical URI--the part of the URI from domain to query string (use '/' if no
/// path)
pub fn task_1_create_a_canonical_request(
    query: String,
    headers: HashMap<String, String>,
    port: Option<u16>,
    host: String,
    amzdate: String,
    method: String,
    data: Vec<u8>,
    security_token: Option<String>,
    data_binary: bool,
    canonical_uri: String) -> (String, String, String) {

    // Step 3: Create the canonical query string. In this example (a GET request), request
    // parameters are in the query string. Query string values must be URL-encoded (space=%20). The
    // parameters must be sorted by name.  For this example, the query string is pre-formatted in
    // the request_parameters variable.
    let canonical_querystring = normalize_query_string(query);

    // If the host was specified in the HTTP header, ensure that the canonical headers are set
    // accordingly
    let fullhost = if headers.contains_key("host") {
        headers["host"].clone()
    } else {
        let fullhost = match port {
            Some(p) => format!("{}:{}", host, p.to_string()),
            None => host,
        };
        fullhost
    };

    // Step 4: Create the canonical headers and signed headers. Header names and value must be
    // trimmed and lowercase, and sorted in ASCII order.  Note that there is a trailing \n.
    let mut canonical_headers = format!("host:{}\nx-amz-date:{}\n", fullhost, amzdate);
    match &security_token {
        Some(t) => canonical_headers.push_str(&format!("x-amz-security-token:{}\n", t)),
        None => (),
    };

    // Step 5: Create the list of signed headers. This lists the headers in the canonical_headers
    // list, delimited with ";" and in alpha order.  Note: The request can include any headers;
    // canonical_headers and signed_headers lists those that you want to be included in the hash of
    // the request. "Host" and "x-amz-date" are always required.
    let mut signed_headers = String::from("host;x-amz-date");
    match &security_token {
        Some(_) => signed_headers.push_str(";x-amz-security-token"),
        None => (),
    };

    // Step 6: Create payload hash (hash of the request body content). For GET requests, the
    // payload is an empty string ("").
    let mut hasher = Sha256::new();
    let payload_hash = if data_binary {
        hasher.input(&data);
        hasher.result_str()
    } else {
        let s = match std::str::from_utf8(&data) {
            Ok(v) => v,
            Err(e) => panic!("Invalid UTF-8 sequence: {}", e),
        };
        hasher.input_str(s);
        hasher.result_str()
    };

    // Step 7: Combine elements to create create canonical request
    let canonical_request = format!("{}\n{}\n{}\n{}\n{}\n{}",
        method, utf8_percent_encode(&canonical_uri, PATH).to_string(), canonical_querystring,
        canonical_headers, signed_headers, payload_hash);

    return (canonical_request, payload_hash, signed_headers)
}
```

## A Cool Rust Error

When you pass something to a function, you can pass a reference to it, or pass
the value itself.  What it does when you pass the value can depend on the type,
but in many cases it might do a copy.  Sometimes that's fine for simple types,
but what if your program is copying a complex object that contains things that
shouldn't be copied?

Well, this was quite a cool rust error.  Apparently by default, rust will "move"
the value, which probably means giving the reference to whever you're passing it
to.  It can do this once, but if you try to do this twice it will complain that
it has already moved the value and fail:

```
 $ cargo test
   Compiling aws-signature-proxy v0.1.0 (/home/sverch/projects/aws-signature-proxy)
warning: unused variable: `data`
  --> src/aws_signature_builder/mod.rs:18:5
   |
18 |     data: String,
   |     ^^^^ help: consider prefixing with an underscore: `_data`
   |
   = note: #[warn(unused_variables)] on by default

warning: unused variable: `data_binary`
  --> src/aws_signature_builder/mod.rs:20:5
   |
20 |     data_binary: bool,
   |     ^^^^^^^^^^^ help: consider prefixing with an underscore: `_data_binary`

error[E0382]: use of moved value: `security_token`
  --> src/aws_signature_builder/mod.rs:49:11
   |
40 |         Some(t) => canonical_headers.push_str(&format!("x-amz-security-token:{}\n", t)),
   |              - value moved here
...
49 |     match security_token {
   |           ^^^^^^^^^^^^^^ value used here after partial move
   |
   = note: move occurs because value has type `std::string::String`, which does not implement the `Copy` trait

error: aborting due to previous error

For more information about this error, try `rustc --explain E0382`.
error: Could not compile `aws-signature-proxy`.

To learn more, run the command again with --verbose.
```

It's complaining that there is no explicit copy trait defined, rather than
compiling successfully and trying to guess.  I like that.  All I had to do to
fix it was put an `&` in front of `security_token` to tell rust that I'm passing
a reference and it doesn't have to move or copy anything.

See [this forum
post](https://users.rust-lang.org/t/help-to-fix-build-error-use-of-moved-value/19579/2)
for a good description of this issue.

## Next Time

I have some pretty clear things to pick up next time.  First I'll port the rest
of the signature stages to Rust, and then write the middleware so that the proxy
will add the signature headers.  Then I think I'm ready to go!
