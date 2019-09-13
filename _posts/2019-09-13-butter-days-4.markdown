---
layout: post
title:  "Butter Days: Day 4"
date:   2019-09-13 01:00:00 -0500
categories: butter open-source
---
This is Day 4 of [Butter Days]({% post_url 2019-09-06-butter-days-3 %}), from
High Rise Bakery in Jefferson City, MO.

I'm unfortunately a little sick today, so this might be shorter, but we'll see
how far I can make it.  I want to be consistent about doing this at the very
least.

See [Day 1 of Butter Days]({% post_url 2019-08-23-butter-days-1 %}) for context
on what I'm trying to build.

For the purposes of this post, I'm currently trying to write something that can
interact with the AWS API using the [OpenAPI
spec](https://github.com/APIs-guru/openapi-directory/tree/master/APIs/), in part
because I'm hoping that generating these things programmatically can help save
me some time later if I try to do more interesting things with it.

Last week I tried to use the [OpenAPI
Generator](https://github.com/OpenAPITools/openapi-generator/) to generate a
Rust client, but the generated code was apparently using the "harder" client
library and hasn't been updated recently.  Today I'm going to try to generate
the
[reqwest](https://github.com/OpenAPITools/openapi-generator/tree/master/samples/client/petstore/rust-reqwest)
version of the client, which is apparently the easier one to use.

<hr>
<br>

## Creating A Project

I'm going to copy the commands I used in my last post, and run them all quickly
here.  First, let's generate a new project:

```
$ cargo new reqwest-openapi-client
     Created binary (application) `reqwest-openapi-client` package
$ tree reqwest-openapi-client
reqwest-openapi-client/
├── Cargo.toml
└── src
    └── main.rs
```

Now, let's figure out how to generate the rust-reqwest example:

```
$ docker run --rm -v ${PWD}:/local \
    openapitools/openapi-generator-cli list | grep rust
    - rust
    - rust-server
```

Looks like there isn't a generator called `rust-reqwest`.  Searching the github
repo for the openapi generator turns up [this
result](https://github.com/OpenAPITools/openapi-generator/blob/d7b390f328a597438edd6a72a9f1ff495ca7080a/bin/rust-reqwest-petstore.sh#L30):

```
ags="generate -t modules/openapi-generator/src/main/resources/rust \
    -i modules/openapi-generator/src/test/resources/2_0/petstore.yaml \
    -g rust -o samples/client/petstore/rust-reqwest \
    --additional-properties packageName=petstore_client \
    --library=reqwest $@"
```

So looks `--additional-properties packageName=petstore_client` and
`--library=reqwest` are the options I need.  Let's try that:

```
$ docker run --rm -v ${PWD}:/local/out/rust/ \
    openapitools/openapi-generator-cli generate \
    -i http://petstore.swagger.io/v2/swagger.json \
    -g rust -o /local/out/rust/generated \
    --additional-properties packageName=petstore_client \
    --library=reqwest
...
$ ls generated/
Cargo.toml  docs  git_push.sh  README.md  src
$ cat generated/Cargo.toml 
[package]
name = "petstore_client"
version = "1.0.0"
authors = ["OpenAPI Generator team and contributors"]

[dependencies]
serde = "^1.0"
serde_derive = "^1.0"
serde_json = "^1.0"
url = "1.5"
reqwest = "~0.9"

[dev-dependencies]
```

That looks right to me!  Now let's use the same version of `reqwest` in my
package and run it:

```
# Modify `Cargo.toml` to include `reqwest`
$ cargo run
# lots of package downloads/builds
Hello, world!
```

## Using Reqwest

Before we get into the openapi stuff, let's try to understand the basics of
reqwest.  I'm first trying to copy the [example from the docs main
page](https://docs.rs/reqwest/0.9.20/reqwest/):

```
let body = reqwest::get("https://www.rust-lang.org")?.text()?;

println!("body = {:?}", body);
```

I get this error when I paste that in:

```
src/main.rs|4 col 16 error 277| the `?` operator can only be used in a function
that returns `Result` or `Option` (or another type that implements
`std::ops::Try`)
```

The question mark is an interesting [error handling
mechanism](https://stackoverflow.com/a/42921174) in rust.  Rust doesn't have
exceptions, so the question mark will either return from the calling function
with an error object or return the result to the calling function.  Interesting.
That post does a good example of explaining it and showing the "expanded"
version.

Instead of trying to figure that out, I'm going to just look at the [in tree
examples](https://github.com/seanmonstar/reqwest/tree/master/examples) because
those are more likely to be complete/working (because someone has probably run
them).

Sure enough, in the example, I see that main has this signature:

```rust
fn main() -> Result<(), Box<dyn std::error::Error>> {
    ...
}
```

In retrospect, it should probably have been obvious from the error message (and
the way the `?` operator works) that the problem was that my caller function was
wrong (from the "can only be used in a function that ..." part), but I would
have had to search for the correct signature anyway.

I got a "mismatched types" error when I first added the signature, but that was
just because I wasn't returning anything and I had just declared that `main`
should return something.  When I did `cargo run` instead of relying on the
editor I got a much more helpful "this function's body doesn't return" message
for the same problem.  Interesting that the error messages are different.

This is the final result:

```rust
use reqwest;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let body = reqwest::get("https://www.rust-lang.org")?.text()?;

    println!("body = {:?}", body);
    Ok(())
}
```

All right!  That was much easier than [hyper](https://github.com/hyperium/hyper)
which has a bunch of fancy async stuff that I haven't learned yet.  Now let's
see how the openapi client looks.

## Using OpenAPI With Reqwest

Now that we have our generated definitions and a basic understanding of reqwest,
let's try to use them to connect to the petstore.

Like last time, I'm going to add this line to my `Cargo.toml` file:

```
petstore_client = { path = "./generated" }
```

Note that I'm using `petstore_client` instead of `openapi` like I did before.
Last time I didn't pass `packageName=petstore_client` so the default name was
`openapi`.  You can see this in the library's `Cargo.toml` file.

Now, when I add `use petstore_client` to the top of my main file, I don't get
any import errors.

Oh, I also forgot that the generator generates everything as root.  Let's fix
that:

```
$ sudo chown sverch:sverch -R generated/
```

All right, from last time I know that `generated/src/apis/mod.rs` should have
the module exports, so I'm starting there.

I see `pub mod client;` at the bottom of that file, so I'm also going to look in
`client.rs`.

I still get these warnings, so we'll see if that's a problem:

```
  1 generated/src/apis/client.rs|6 col 18 warning| trait objects without an explicit `dyn` are deprecated
```

In that file, I see this, which looks like what I want:

```
impl APIClient {
    pub fn new(configuration: Configuration) -> APIClient {
        ...
    }
    ...
}
```

Also from last time, I remember that this is the path I need to get that object:

```rust
let apiclient = openapi::apis::client::APIClient::new(configuration);
```

After this I just spent some time chasing argument types and listening to the
compiler errors.  Here are some highlights:

```
src/main.rs|6 col 9 warning| variable does not need to be mutable
```

Well that's nice.  So you can immediately see exactly which variables are being
modified?

```
src/main.rs|7 col 5 warning| unused `std::result::Result` that must be used
```

It seems nice that the compiler warns you when you're dropping return values on
the ground too.

After resolving all the errors, I ended up with this:

```rust
use petstore_client;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let configuration = petstore_client::apis::configuration::Configuration::new();
    let apiclient = petstore_client::apis::client::APIClient::new(configuration);
    let status = vec![std::string::String::from("pending")];
    let result = apiclient.pet_api().find_pets_by_status(status);
    println!("result = {:?}", result);
    Ok(())
}
```

It failed with an error though:

```
$ cargo run
    Finished dev [unoptimized + debuginfo] target(s) in 0.06s
     Running `target/debug/reqwest-openapi-client`
result = Err(Reqwest(Error(Json(Error("invalid type: null, expected struct Tag", line: 1, column: 2807)))))
```

Looks like an error deserializing some JSON into the Pet object, because that
object has a "Tag" member.  I'm not feeding it any JSON myself, so I suspect one
of the responses from the petstore API has the "Tag" set to `null`.

Here's the `Pet` struct:

```rust
#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub struct Pet {
    #[serde(rename = "id", skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    #[serde(rename = "category", skip_serializing_if = "Option::is_none")]
    pub category: Option<crate::models::Category>,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "photoUrls")]
    pub photo_urls: Vec<String>,
    #[serde(rename = "tags", skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<crate::models::Tag>>,
    /// pet status in the store
    #[serde(rename = "status", skip_serializing_if = "Option::is_none")]
    pub status: Option<Status>,
}
```

The thing that's interesting to me here is that the complaint was about a
specific "Tag" rather than the "tags" vector.  Perhaps someone was able to tag
something as "null".

I could probably use curl to see what I get back from the API, but let's try to
actually debug this as if I can't.

Looks like [`println!` is what a lot of people are using to debug
rust](https://www.reddit.com/r/rust/comments/9hpk65/which_tools_are_you_using_to_debug_rust_projects/),
although that post also mentions gdb.

My goal right is to actually show the raw data coming back from the API, which I
thought I could do by turning on verbose logging in the reqwest library, but it
looks like [that might not be implemented
yet](https://github.com/seanmonstar/reqwest/issues/87).

For now, maybe I can try to change the tag vector to accept nulls by putting an
`Option` in it:

```
pub tags: Option<Vec<Option<crate::models::Tag>>>,
```

It works!  I can see the list of results returned now:

```
$ cargo run
    Finished dev [unoptimized + debuginfo] target(s) in 0.06s
     Running `target/debug/reqwest-openapi-client`
name: "BDQxyOdDla", tags: Some([Some(Tag { id: Some(200215257), name: Some("FpkaVCJVyx") })])
name: "yYarCDsAwn", tags: Some([Some(Tag { id: Some(281704845), name: Some("aRBNvwWrLu") })])
name: "wzuYGHMfSc", tags: Some([Some(Tag { id: Some(1701081993), name: Some("MCNIIhOFYa") })])
name: "kqHAvqHbZR", tags: Some([Some(Tag { id: Some(1326885280), name: Some("yxFSgRzyBm") })])
name: "fXzdCBBDPC", tags: Some([Some(Tag { id: Some(1085091743), name: Some("QTWBmqvYji") })])
name: "Das", tags: Some([None])
name: "dmmax", tags: Some([Some(Tag { id: Some(0), name: Some("string") })])
name: "Asdas", tags: Some([None])
name: "Dasda", tags: Some([None])
name: "Asdas", tags: Some([None])
name: "Asdas", tags: Some([Some(Tag { id: Some(0), name: Some("Asdasd") })])
name: "Asdasd", tags: Some([Some(Tag { id: Some(0), name: Some("Asdas") })])
name: "Asd", tags: Some([Some(Tag { id: Some(0), name: Some("Asdasd") })])
name: "getcat", tags: Some([Some(Tag { id: Some(102), name: Some("testtag1") }), Some(Tag { id: Some(103), name: Some("testtag2") })])
name: "getcat", tags: Some([Some(Tag { id: Some(102), name: Some("testtag1") }), Some(Tag { id: Some(103), name: Some("testtag2") })])
name: "getcat", tags: Some([Some(Tag { id: Some(102), name: Some("testtag1") }), Some(Tag { id: Some(103), name: Some("testtag2") })])
name: "ThSpet746258212691", tags: Some([Some(Tag { id: Some(351), name: Some("ThStag446253943928") })])
name: "Leia", tags: Some([])
name: "Leia", tags: Some([])
name: "Asdasd", tags: Some([Some(Tag { id: Some(0), name: Some("Asdasd") })])
name: "Asdaasdasdasdasdasdasldkasñldkalsñkdañlsdñskdañskdlañskdñldas", tags: Some([Some(Tag { id: Some(0), name: Some("Asdasdasd") })])
name: "Leia", tags: Some([Some(Tag { id: Some(0), name: Some("peteia") })])
name: "jjjggh", tags: Some([Some(Tag { id: Some(0), name: Some("hgghj") })])
name: "MyLittlePet", tags: Some([])
name: "Eeeeeee", tags: Some([Some(Tag { id: Some(0), name: Some("Asdasdasdasdasd") })])
name: "Changed Kitty Price", tags: Some([Some(Tag { id: Some(10), name: Some("string") })])
name: "ef_dog_doberman", tags: Some([Some(Tag { id: Some(0), name: Some("string") })])
name: "getcat", tags: Some([Some(Tag { id: Some(102), name: Some("testtag1") }), Some(Tag { id: Some(103), name: Some("testtag2") })])
name: "getcat", tags: Some([Some(Tag { id: Some(102), name: Some("testtag1") }), Some(Tag { id: Some(103), name: Some("testtag2") })])
name: "getcat", tags: Some([Some(Tag { id: Some(102), name: Some("testtag1") }), Some(Tag { id: Some(103), name: Some("testtag2") })])
name: "getcat", tags: Some([Some(Tag { id: Some(102), name: Some("testtag1") }), Some(Tag { id: Some(103), name: Some("testtag2") })])
name: "dfdffddffdfddf", tags: Some([])
name: "THE ROCK", tags: Some([Some(Tag { id: Some(1469), name: Some("espn.com") })])
name: "Droopy Dog", tags: Some([Some(Tag { id: Some(2), name: Some("Beagle") })])
name: "Wayne", tags: Some([])
name: "SNUGGLES T CAT", tags: Some([Some(Tag { id: Some(1), name: Some("blue eyes") })])
name: "SNUGGLES T CAT", tags: Some([Some(Tag { id: Some(1), name: Some("blue eyes") })])
name: "SNUGGLES T CAT", tags: Some([Some(Tag { id: Some(1), name: Some("blue eyes") })])
name: "SNUGGLES T CAT", tags: Some([Some(Tag { id: Some(1), name: Some("blue eyes") })])
name: "hsgDoggie", tags: Some([Some(Tag { id: Some(646), name: Some("hsgTag") })])
name: "GoldenRetriever", tags: Some([Some(Tag { id: Some(0), name: Some("string") })])
name: "Enrique", tags: Some([Some(Tag { id: Some(4), name: Some("string") })])
name: "doggie_UPDATED", tags: Some([Some(Tag { id: Some(0), name: Some("string") })])
name: "elixir client updatePet", tags: None
name: "dfdfdfdfdf", tags: Some([])
Found 28 doggies!
Found 15 doggieUpdateds!
```

That's a lot of doggies.  Also a lot of updated doggies.  Also a lot of cat
people.  I think the `Some([None])` in the tags arrays are from the null tags.
I wonder if the openapi spec says that should be allowed.

Here's the final code:

```rust
use petstore_client;

fn main() {
    let configuration = petstore_client::apis::configuration::Configuration::new();
    let apiclient = petstore_client::apis::client::APIClient::new(configuration);
    let status = vec![std::string::String::from("pending")];
    let result = apiclient.pet_api().find_pets_by_status(status);
    let mut doggies = 0;
    let mut doggie_updateds = 0;
    match result {
        Ok(r) => {
            for pet in r {
                if pet.name == "doggie" {
                    doggies = doggies + 1;
                } else if pet.name == "doggieUpdated" {
                    doggie_updateds = doggie_updateds + 1;
                } else {
                    println!("name: {:?}, tags: {:?}", pet.name, pet.tags);
                }
            }
            println!("Found {} doggies!", doggies);
            println!("Found {} doggieUpdateds!", doggie_updateds);
        }
        Err(e) => {
            println!("error calling api: {:?}", e);
        }
    }
}
```

Great!  So now I've gotten a simple example working with generated code from a
swagger spec, although I had to change the generated code, which effectively
makes it unusable until I figure that out (no one wants to have a human maintain
code that should be machine generated...).

## Nulls In Arrays

I want to figure out what's going on with this `null` value in the tags array.
First, here's what the spec I used to generate my client says about the tags
array:

```
$ curl --silent --output - http://petstore.swagger.io/v2/swagger.json \
    | jq ". | keys"
"swagger"
"info"
"host"
"basePath"
"tags"
"schemes"
"paths"
"securityDefinitions"
"definitions"
"externalDocs"
$ curl --silent --output - http://petstore.swagger.io/v2/swagger.json \
    | jq ".definitions.Pet.properties.tags"
{
  "type": "array",
  "xml": {
    "name": "tag",
    "wrapped": true
  },
  "items": {
    "$ref": "#/definitions/Tag"
  }
}
```

I can see for sure that there are some null tags (curl command taken from
[petstore.swagger.io](petstore.swagger.io), which has great auto generated
browsable documentation):

```
$ curl -X GET "https://petstore.swagger.io/v2/pet/findByStatus?status=pending" \
    -H "accept: application/json" | jq ".[].tags"
...
[
  null
]
...
```

According to the spec, this is just an "array" type with no mention of `null`,
but instead of `Tag` objects, some of the elements are `null`.  Is that allowed?

Apparently this is a [much discussed
issue](https://github.com/OAI/OpenAPI-Specification/issues/229).  I'm reading
that and trying to understand what the conclusion was.  From the description it
looks like nulls in arrays aren't actually supported by the spec, at least when
the issue was written.

That makes me think that either I'm using the old version of something, or that
the petstore allowed nulls somehow when it shouldn't.

The issue was closed with [this
comment](https://github.com/OAI/OpenAPI-Specification/issues/229#issuecomment-283748079),
so apparently `nullable` is what I'm looking for.  I should probably also
understand what `wrapped` means.

For what it's worth, the swagger spec for the petstore doesn't say anything is
`nullable`:

```
$ curl --silent --output - http://petstore.swagger.io/v2/swagger.json \
    | jq "." | grep null
(nothing)
```

So unless something is nullable by default, this might be a problem with the
petstore.

Looks like the petstore example is also running version `2.0`:

```
$ curl --silent --output - http://petstore.swagger.io/v2/swagger.json \
    | jq ".swagger"
"2.0"
```

The openapi specification is [currently on version
`3.0.2`](https://github.com/OAI/OpenAPI-Specification/releases/tag/3.0.2).  That
might make finding this issue a bit of a pain, because it might already be fixed
in a more recent spec version.

## Filing An Issue

Before I file an issue for this, I want to see if I can get a small test case
working.

In playing around with [petstore.swagger.io](http://petstore.swagger.io), I can
see that they have a nice api browser where I can execute things, and they even
have the `curl` examples.  I don't see the things that I'm posting to the api
showing up in the results though, which is odd considering how much garbage is
in there already.  I think I would need this to show a good test case, unless I
can figure out what server the petstore is running and run it myself.

Although web searches return so many autogenerated results that I have no idea
which one they're running.

I'll just file one and see what they say, because the generated rust client not
working is enough of a bug, even if I'm not sure whether it's the server or the
client that is broken.

I tried to search the github project for issues related to this, but I didn't
find anything that obviously matched my issue.  I see this one about [supporting
extra things in the spec related to
nullable](https://github.com/OAI/OpenAPI-Specification/issues/1389), but the
spec I'm generated from has no mention of `null`.

All right, [filed an
issue](https://github.com/OAI/OpenAPI-Specification/issues/2003).  That will
probably be the best way to figure out what's going on here, and since the
library was broken in a way that required me to modify it, I'm sure that there's
either a bug somewhere or the docker container that I've been using to run the
generator is stale (which is possible).

## Next Time

All right, so I now have a Rust Rest Client!  One step closer.

Next time, I want to try to get a single call to AWS working from Rust, which
will require some extra code because of AWS's fancy
[signatures](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)
in their auth process.  Fortunately, I can reference this [awscurl
project](https://github.com/okigan/awscurl) that I already tested and know
works.

From there, I'd want to actually generate the client library for AWS in Rust
from the openapi spec and try to get that authenticated as well.

After that, the only limit is yourself.

## Oops

I accidentally filed the issue [in the wrong
repo](https://github.com/OAI/OpenAPI-Specification/issues/2003#issuecomment-531411685).
I filed it against the spec instead of against the actual generator, which
doesn't make sense.

Filed a new issue in the [actual generator
project](https://github.com/OpenAPITools/openapi-generator/issues/3885), so
let's see where that goes.
