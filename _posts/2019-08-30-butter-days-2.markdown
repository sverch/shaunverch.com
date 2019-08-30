---
layout: post
title:  "Butter Days: Day 2"
date:   2019-08-30 1:00:00 -0500
categories: butter open-source
---
This is Day 2 of [Butter Days]({% post_url 2019-08-23-butter-days-1 %}), from
Broad Street Market in Harrisburg, PA.

My current goal is to write a tool that reads policies written for [Open Policy
Agent](https://www.openpolicyagent.org/) and checks whether your [AWS Identity
and Access Management
(IAM)](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html)
configuration violates those policies.

The first step is to dump all the IAM information I need.  I know I have many
options to do this, but I want to do it by reading [these OpenAPI
specs](https://github.com/APIs-guru/openapi-directory/tree/master/APIs/) and
using the APIs directly, rather than using a language library.  I'm hoping this
will make the library more portable across providers and make it easy to auto
generate any definitions I need to work with the Open Policy Agent.

Spoiler: I didn't finish this.  I did make a "Hello World" Rust REST client and
learned a little bit about how the kind of client I'm trying to build would
look, so next time hopefully I can get a little closer to what I'm actually
trying to do.

<hr>
<br>

## First Steps With Rust

Before I do anything, I need to create a new project.

To save refactoring time later, let's look at the [correct Rust project
structure](https://doc.rust-lang.org/cargo/guide/project-layout.html) and do
that from the beginning.  Even better, there's a [Rust project
generator](https://github.com/ashleygwilliams/cargo-generate) with a lot of
[prebuilt
templates](https://github.com/ashleygwilliams/cargo-generate/blob/master/TEMPLATES.md).
Since this is going to start out as a CLI tool, I'll use the [CLI
template](https://github.com/rust-cli/cli-template).

Before I can use that generator, I need to install Rust and Cargo (the Rust
package manager).  I'm using Fedora right now so I'm going to [install using
`dnf`](https://developer.fedoraproject.org/tech/languages/rust/rust-installation.html):

```
$ sudo dnf install rust cargo
...
$ rustc --version
rustc 1.33.0
$ cargo --version
cargo 1.33.0
```

[Rust is on 1.37.0](https://blog.rust-lang.org/2019/08/15/Rust-1.37.0.html) so
this is a bit behind.  That release announcement mentions
[`rustup`](https://rustup.rs/) so maybe that's the officially recommended
installer.  Let's try that.

```
$ curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
info: downloading installer

Welcome to Rust!

This will download and install the official compiler for the Rust programming 
language, and its package manager, Cargo.

It will add the cargo, rustc, rustup and other commands to Cargo's bin 
directory, located at:

  /home/sverch/.cargo/bin

This path will then be added to your PATH environment variable by modifying the
profile files located at:

  /home/sverch/.profile
  /home/sverch/.bash_profile

You can uninstall at any time with rustup self uninstall and these changes will
be reverted.

Current installation options:

   default host triple: x86_64-unknown-linux-gnu
     default toolchain: stable
  modify PATH variable: yes

1) Proceed with installation (default)
2) Customize installation
3) Cancel installation
>1

...

  stable installed - rustc 1.37.0 (eae3437df 2019-08-13)


Rust is installed now. Great!

To get started you need Cargo's bin directory ($HOME/.cargo/bin) in your PATH
environment variable. Next time you log in this will be done automatically.

To configure your current shell run source $HOME/.cargo/env
$ source $HOME/.cargo/env
$ rustc --version
rustc 1.37.0 (eae3437df 2019-08-13)
$ cargo --version
cargo 1.37.0 (9edd08916 2019-08-02)
```

Much better!

Now I can actually generate my project:

```
$ cargo install cargo-generate
...
   Installed package `cargo-generate v0.4.0` (executable `cargo-generate`)
$ cargo generate --git https://github.com/rust-cli/cli-template.git --name iam-enforcer
 Creating project called `iam-enforcer`...
 Done! New project created /home/sverch/projects/iam-enforcer/iam-enforcer
$ cd iam-enforcer
$ cargo run
...
warning: unused `std::result::Result` that must be used
  --> src/main.rs:33:13
   |
33 |             writeln!(stdout, "{}: {}", line_no + 1, line);
   |             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   |
   = note: #[warn(unused_must_use)] on by default
   = note: this `Result` may be an `Err` variant, which should be handled
   = note: this warning originates in a macro outside of the current crate (in Nightly builds, run with -Z external-macro-backtrace for more info)

    Finished dev [unoptimized + debuginfo] target(s) in 10.30s
     Running `target/debug/iam-enforcer`
error: The following required arguments were not provided:
    <pattern>
    <path>

USAGE:
    iam-enforcer <pattern> <path>

For more information try --help
```

I just happened to vaguely remember that [cargo has a `run`
command](https://doc.rust-lang.org/cargo/commands/cargo-run.html).  I first
entered the project and had no idea how to easily compile/run it, but the run
command is nice because it installs all dependencies, compiles, and runs the
package.

> That warning is because the generated code doesn't use the return value from a
> function that's tagged with `must_use`, which is apparently an [attribute you
> can set to require that callers use your return
> value](https://news.ycombinator.com/item?id=7792660).

## The Rust REST Client

So now let's try using the [Rust REST
Client](https://github.com/spietika/restson-rust).

I'm following the [Getting Started
Guide](https://github.com/spietika/restson-rust#getting-started) in that
library.

The first thing I notice is that Rust asks you to define [data
structures](https://github.com/spietika/restson-rust#data-structures) for the
responses from the API you're using.  That makes sense, although it might not
work well with the goal of having a client that is dynamically created based on
openapi specs.  Let's try it anyway and see how far I can go.

## The Client Code

As I'm writing this I'm going to try to understand what this code is actually
doing.

First, is this data structure definition:

```
#[macro_use]
extern crate serde_derive;

#[derive(Serialize,Deserialize)]
struct HttpBinAnything {
    method: String,
    url: String,
}
```

I assume that first section is just the incantation to import `serde_derive`,
which looks like it contains the macros for [Rust's serialization
library](https://serde.rs/derive.html).  It looks like `macro_use` is there to
[import all the macros](https://doc.rust-lang.org/1.7.0/book/macros.html) from
`serde_derive`.  I don't fully understand Rust macros, but they look similar to
C macros in that they do source code replacement early in the compilation.

> Sidenote: Similar to C/C++ where you can pass specific flags to [show the code
> after macros have been expanded](https://stackoverflow.com/a/985411), rust has
> something similar, and someone wrote a [cargo
> subcommand](https://github.com/dtolnay/cargo-expand) to do that for rust.
> Cool!

The [derive](https://doc.rust-lang.org/rust-by-example/trait/derive.html) looks
like it comes from [Rust's trait
system](https://blog.rust-lang.org/2015/05/11/traits.html).  So it looks like
this is giving the `HttpBinAnything` struct the ability to `Serialize` and
`Deserialize` itself.

Next section is about the actual paths:

```
// plain API call without parameters
impl RestPath<()> for HttpBinAnything {
    fn get_path(_: ()) -> Result<String,Error> { Ok(String::from("anything")) }
}

// API call with one u32 parameter (e.g. "http://httpbin.org/anything/1234")
impl RestPath<u32> for HttpBinAnything {
    fn get_path(param: u32) -> Result<String,Error> { Ok(format!("anything/{}", param)) }
}
```

It seems like these somehow define how to handle requests on an HttpBinAnything
object.  I'm going to be lazy and just copy in the rest of the code from the
README.  First, building the client object:

```
let mut client = RestClient::new("http://httpbin.org").unwrap();
```

Then, running a get:

```
let data: HttpBinAnything = client.get(1234).unwrap();
```

Actually, I just found [this example](https://docs.rs/restson/0.5.4/restson/) so
I'm going to try and run that.

It works!  Put up a [pull request for this
example](https://github.com/sverch/iam-enforcer/pull/2).

Based on that example, it looks like what you're actually doing by defining
those routes is telling rust what to do when someone is asking for the
`HttpBinAnything` type, and it knows what function to call based on the type
being returned from `get`.

## OpenAPI Generator

Originally I had in my mind the idea of creating a library that could read the
OpenAPI files and dynamically generate a client that tells you what you can
call (think "list methods" or something like that).  I don't think that will
work in Rust (and I don't think it's really the Rust way), so I'm going to use
the OpenAPI generator to generate a client.

First, I'm going to try out this [petstore
example](https://github.com/OpenAPITools/openapi-generator/tree/master/samples/client/petstore/rust-reqwest)
to see if I can get that working.  It looks like there's a [petstore server
example](https://github.com/OpenAPITools/openapi-generator/tree/master/samples/server/petstore/rust-server/output/openapi-v3)
in Rust as well, so I could use that for consistency.

```
$ git clone git@github.com:OpenAPITools/openapi-generator.git
$ cd samples/server/petstore/rust-server/output/openapi-v3/
$ cargo run --example server -- https

...

error: trait objects without an explicit `dyn` are deprecated
   --> output/openapi-v3/src/server/mod.rs:558:97
    |
558 |             _ => Box::new(future::ok(Response::new().with_status(StatusCode::NotFound))) as Box<Future<Item=Response, Error=Error>>,
    |                                                                                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ help: use `dyn`: `dyn Future<Item=Response, Error=Error>`

error: aborting due to 81 previous errors

error: Could not compile `openapi-v3`.

To learn more, run the command again with --verbose.
```

Well, it looks like upgrading to the latest version might have caused me some
issues since this code is doing something that is now deprecated.

This is probably not a good path to go down for now, and seems like it may be
the start of something new.  I think I'll cut it off here because it's been a
long day/week and I'm not thinking clearly at this point.

## Next Time

Now I know that doing something dynamic with Rust (again, like
[pyswagger](https://github.com/pyopenapi/pyswagger)) is probably not the way.
This means that if I want to do this I'll be relying on the [OpenAPI
generator](https://github.com/OpenAPITools/openapi-generator/).

So next time, I'll try to understand that generator and generate some
clients/servers for various languages.  I'm going to be opening a lot of
[petstores](https://github.com/OAI/OpenAPI-Specification/blob/master/examples/v3.0/petstore.yaml).
