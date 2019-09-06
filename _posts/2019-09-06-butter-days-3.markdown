---
layout: post
title:  "Butter Days: Day 3"
date:   2019-09-06 01:00:00 -0500
categories: butter open-source
---
This is Day 3 of [Butter Days]({% post_url 2019-08-30-butter-days-2 %}), from
Quay Coffee in Kansas City, MO.

I'm still trying to write a tool that reads policies written for [Open Policy
Agent](https://www.openpolicyagent.org/) and checks whether your [AWS Identity
and Access Management
(IAM)](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html)
configuration violates those policies.

Today, I'm going to learn how to use the [OpenAPI
Generator](https://github.com/OpenAPITools/openapi-generator/) and try to
generate a server and client for various OpenAPI schemas.  Ultimately, I'm
hoping to generate a server and client from the [OpenAPI spec for
AWS](https://github.com/APIs-guru/openapi-directory/tree/master/APIs/), but
we'll see how far I make it.

<hr>
<br>

## My First OpenAPI Server

Let's get started using the [OpenAPI
Generator](https://github.com/OpenAPITools/openapi-generator/).  I already
cloned it in my last post, so let's try to follow the README.

Alright, I most definitely do not want to spend my time mucking about trying to
figure out what Java dependencies I need, so let's use the [prebuilt Docker
container](https://github.com/OpenAPITools/openapi-generator/#16---docker).

```
$ docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli generate \
    -i https://raw.githubusercontent.com/openapitools/openapi-generator/master/modules/openapi-generator/src/test/resources/2_0/petstore.yaml \
    -g go -o /local/out/go
...
[main] INFO  o.o.codegen.AbstractGenerator - writing file /local/out/go/README.md
...
$ ls out
go
```

The `-v` option is telling docker to map the `/local` directory to `${PWD}`, so
we see `out` in whatever directory we ran this command.

I can see `# Go API client for openapi` in the README, so it looks like this
generated the client rather than the server.  I'm assuming the `-g go` is what's
telling it to generate the Golang client.  Let's see if I can generate the
server.

I did a web search and found ["Server stub generator
HOWTO"](https://github.com/OpenAPITools/openapi-generator/wiki/Server-stub-generator-HOWTO).
It looks like they pass the `-l` option instead of the `-g` option from the
original command.  Let's find out what those are.

```
$ docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli help generate
...
        -g <generator name>, --generator-name <generator name>
            generator to use (see list command for list)
...
        --library <library>
            library template (sub-template)
...
```

Ok, so there's some sort of library plugin system for the server I guess, but
it's different for the client?  Maybe that makes sense, because there's more
variety of server frameworks than clients, so you might want to (and they do)
have generators multiple frameworks written in the same language.

Anyway, let's generate the
[go-server](https://github.com/OpenAPITools/openapi-generator/wiki/Server-stub-generator-HOWTO#go-server),
since that's the language I've used most recently, and the client that the
example in the README generated.

```
$ docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli generate \
    -i http://petstore.swagger.io/v2/swagger.json \
    -l go-server \
    -o samples/server/petstore/go-server
[error] Found unexpected parameters: [-l, go-server]

See 'openapi-generator help' for usage.
```

Maybe I'm using an older version that doesn't have the `-l` short option.

```
$ docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli generate \
    -i http://petstore.swagger.io/v2/swagger.json \
    --library go-server \
    -o samples/server/petstore/go-server
[error] A generator name (--generator-name / -g) is required.
```

Ok, now I think I'm doing something wrong.  I'm looking now at the [npm
wrapper](https://openapi-generator.tech/docs/generators.html) for this project,
to see if they have more up to date/correct examples.

I notice from the [usage](https://openapi-generator.tech/docs/usage) that
there's a `list` command to show all generators.  Let's try that.

```
$ docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli list
...
SERVER generators.
...
    - go-server
...
```

That makes more sense!  The `go-server` is just another generator, so I should
use `-g`.  I have no idea where this `-l` option came from.  Let's try it with
the correct flag.

```
$ docker run --rm -v ${PWD}:/samples openapitools/openapi-generator-cli generate \
    -i http://petstore.swagger.io/v2/swagger.json \
    -g go-server \
    -o samples/server/petstore/go-server
...
[main] INFO  o.o.codegen.AbstractGenerator - writing file /samples/server/petstore/go-server/.openapi-generator/VERSION
$ ls server/petstore/go-server/
api  Dockerfile  go  main.go  README.md
```

Looks good!  Because I'm using the `-o` option to write to `samples`, I need to
map that from the docker container to my current directory instead of `/local`.
Let's see if it works.

```
$ cd server/petstore/go-server/
$ go run main.go
go: open /home/sverch/projects/openapi-generator/out/go/go.mod: permission denied
```

Well, that's odd.  Let's check the permissions.

```
$ ls -l ../../../go.mod
-rw-r--r--. 1 root root 181 Sep  6 15:12 ../../../go.mod
```

I have no idea why it generated this as root.  Let's fix that.

```
$ sudo chown -R sverch:sverch ../../../../../out/
$ go run main.go
go: finding github.com/antihax/optional v0.0.0-20180406194304-ca021399b1a6
build github.com/GIT_USER_ID/GIT_REPO_ID/server/petstore/go-server: cannot find module for path _/home/sverch/projects/openapi-generator/out/go/server/petstore/go-server/go
```

Ok, I happen to know this is because I'm not in any
[`GOPATH`](https://github.com/golang/go/wiki/GOPATH).  Golang has [particular
rules](https://golang.org/doc/code.html) for where it expects your source to
live.  Let me move it into my `GOPATH`.

```
$ echo $GOPATH
/home/sverch/go/
$ mkdir -p $GOPATH/src/github.com/sverch/
$ cp -r out/go/server $GOPATH/src/github.com/sverch/generated-go-server
$ cd $GOPATH/src/github.com/sverch/generated-go-server/petstore/go-server
$ go run main.go
go/routers.go:18:2: cannot find package "github.com/gorilla/mux" in any of.
	/usr/local/go/src/github.com/gorilla/mux (from $GOROOT)
	/home/sverch/go/src/github.com/gorilla/mux (from $GOPATH)
$ go get -u github.com/gorilla/mux
$ go run main.go
2019/09/06 16:29:43 Server started
```

Hey!  Now we're getting somewhere.  I can see from the code it's running on port
8080, so let's check it out.

```
$ curl localhost:8080
404 page not found
```

Well, that's at least something.  Looking in `go/routers.go`, I see.

```
	{
		"Index",
		"GET",
		"/v2/",
		Index,
	},
```

That looks promising.

```
$ curl localhost:8080/v2/
Hello World!
```

Great!  These are just stubs, so it's not really going to do any real work since
the actual implementation is not part of the spec definition.

## Connecting The OpenAPI Client

Now that I got a server running, let's go back to the client and try to get that
calling the server.

I'll regenerate the client, and save a little time by telling docker to map the
volumes in such a way that the generator just vomits them into the correct path.

```
$ docker run --rm -v ${GOPATH}/src/github.com/sverch/generated-go-client:/local/out/go/ \
    openapitools/openapi-generator-cli generate \
    -i http://petstore.swagger.io/v2/swagger.json \
    -g go -o /local/out/go
$ cd $GOPATH/src/github.com/sverch/generated-go-client
$ sudo chown sverch:sverch -R .
$ ls
api           api_user.go       docs         go.sum                 model_order.go  model_user.go
api_pet.go    client.go         git_push.sh  model_api_response.go  model_pet.go    README.md
api_store.go  configuration.go  go.mod       model_category.go      model_tag.go    response.go
```

The README says that this is a client library, rather than an app that I can
just run, which makes sense.  This means I need to make a new project that
imports this as a library.

```
$ mkdir $GOPATH/src/github.com/sverch/go-openapi-client-example
$ cd $GOPATH/src/github.com/sverch/go-openapi-client-example
```

First, I'll install what the generated README tells me to install.

```
$ go get github.com/stretchr/testify/assert
$ go get golang.org/x/oauth2
$ go get golang.org/x/net/context
$ go get github.com/antihax/optional
```

Then I'll try importing the client from my app.

```go
package main

import (
	client "github.com/sverch/generated-go-client"
	"fmt"
)

func main() {
	fmt.Println("vim-go")
}
```

I'm using the [golang vim plugin](https://github.com/fatih/vim-go), and this
code gives me an "imported but not used" error, which is a good sign that I set
my paths up correctly.

That plugin also allows me to type `client.<ctrl-X><ctrl-O>` and get a list of
all names exported by that library (in Golang, names starting with a [capital
letter are exported](https://tour.golang.org/basics/3)).  I can see one called
"NewApiClient" that looks promising.  Looking at the definition, I see this.

```go
// NewAPIClient creates a new API client. Requires a userAgent string describing your application.
// optionally a custom http.Client to allow for advanced features such as caching.
func NewAPIClient(cfg *Configuration) *APIClient {
    ...
}
```

So I call that function and get the APIClient.  Poking around the methods that
are hanging off the APIClient, I get to this function.

```go
/*
AddPet Add a new pet to the store
 * @param ctx _context.Context - for authentication, logging, cancellation, deadlines, tracing, etc. Passed from http.Request or context.Background().
 * @param body Pet object that needs to be added to the store
*/
func (a *PetApiService) AddPet(ctx _context.Context, body Pet) (*_nethttp.Response, error) {
    ...
}
```

This is looking closer to a real client, although I have no idea what to pass in
for the context argument.  Let's see if I can find any examples.

Ok, looks like there's a [golang sample
client](https://github.com/OpenAPITools/openapi-generator/tree/master/samples/client/petstore/go),
good.  I see they have an ["AddPet"
test](https://github.com/OpenAPITools/openapi-generator/blob/master/samples/client/petstore/go/pet_api_test.go#L30)
with this line.

```go
	r, err := client.PetApi.AddPet(context.Background(), newPet)
```

Actually, above that I see how they set the configuration options, including
this.

```go
const testHost = "petstore.swagger.io:80"
```

So it looks like the petstore is always open.  Makes sense.  I can use that for
now to test building my clients.  I already know how to generate the server
anyway.

Here's what it looks like now.

```go
package main

import (
	"context"
	"fmt"
	sw "github.com/sverch/generated-go-client"
)

func main() {
	cfg := sw.NewConfiguration()
	cfg.AddDefaultHeader("testheader", "testvalue")
	cfg.Host = "petstore.swagger.io:80"
	cfg.Scheme = "http"
	client := sw.NewAPIClient(cfg)
	newPet := (sw.Pet{Id: 12830, Name: "gopher",
		PhotoUrls: []string{"http://1.com", "http://2.com"},
		Status:    "pending", Tags: []sw.Tag{sw.Tag{Id: 1, Name: "tag2"}}})
	r, err := client.PetApi.AddPet(context.Background(), newPet)
	if err != nil {
		fmt.Printf("Error!  %v", err)
		return
	}
	fmt.Printf("Added pet!  %v\n", r.StatusCode)
	pets, r, err := client.PetApi.FindPetsByStatus(context.Background(), []string{"pending"})
	if err != nil {
		fmt.Printf("Error!  %v", err)
		return
	}
	fmt.Printf("Found pets!  %v\n", r.StatusCode)
	doggies := 0
	for _, pet := range pets {
		if pet.Name == "doggie" {
			doggies = doggies + 1
		} else {
			fmt.Printf("Found non doggie pet!  %v\n", pet.Name)
		}
	}
	fmt.Printf("Found %v doggies!\n", doggies)
}
```

And the output.

```
$ go run main.go
Added pet!  200
Found pets!  200
Found non doggie pet!  Murzik
Found non doggie pet!  Murzik
Found non doggie pet!  doggie_UPDATED
Found non doggie pet!  doggieUpdated
Found non doggie pet!  doggieUpdated
Found non doggie pet!  doggieUpdated
Found non doggie pet!  doggieUpdated
Found non doggie pet!  doggieUpdated
Found non doggie pet!  doggieUpdated
Found non doggie pet!  doggieUpdated
Found non doggie pet!  Wayne
Found non doggie pet!  Barsik
Found non doggie pet!  doggieUpdated
Found non doggie pet!  ef_dog_doberman
Found non doggie pet!  Changed Kitty Price
Found non doggie pet!  getcat
Found non doggie pet!  getcat
Found non doggie pet!  getcat
Found non doggie pet!  getcat
Found non doggie pet!  GoldenRetriever
Found non doggie pet!  abc
Found non doggie pet!  gopher
Found 85 doggies!
```

That's a lot of doggies.

## Rust Client

I'm glad I tried this first with a language I already know, but now let's try
Rust.  It should be easier now that I know where the examples are.

Because Rust doesn't have the weird path requirements that Golang has, I think I
can just put it wherever I want.

```
$ mkdir generated-rust-openapi-client
$ cd generated-rust-openapi-client/
$ docker run --rm -v ${PWD}:/local/out/rust/ \
    openapitools/openapi-generator-cli generate \
    -i http://petstore.swagger.io/v2/swagger.json \
    -g rust -o /local/out/rust/generated
...
$ ls generated
Cargo.toml  docs  git_push.sh  README.md  src
$ sudo chown sverch:sverch -R generated
```

Following the README, I should put this in a subdirectory called `generated` and
put this in my `Cargo.toml`.

```toml
    openapi = { path = "./generated" }
```

I found a simple [Rust project generation
example](https://rust-lang-nursery.github.io/cli-wg/tutorial/setup.html) to
generate my main and `Cargo.toml`.

```
$ cargo new grrs
     Created binary (application) `grrs` package
$ tree grrs
grrs
├── Cargo.toml
└── src
    └── main.rs

1 directory, 2 files
```

Perfect.  After copying them back to my current directory, I can run it.

```
$ cargo run
   Compiling grrs v0.1.0 (/home/sverch/projects/generated-rust-openapi-client)
    Finished dev [unoptimized + debuginfo] target(s) in 0.34s
     Running `target/debug/grrs`
Hello, world!
```

Great.  So let's get started by fixing `Cargo.toml` and import the generated
library.

```toml
[package]
name = "generated-rust-openapi-client"
version = "0.1.0"
authors = ["Shaun Verch"]
edition = "2018"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[dependencies]
openapi = { path = "./generated" }
```

Now when I run `cargo run`, I see many more packages get installed.  That's a
good sign.

I also get a ton of `warning: trait objects without an explicit 'dyn' are
deprecated` from the generated code.  Interestingly enough, one of the first
issues I found for this was from the [Rust
protobuf](https://github.com/stepancheg/rust-protobuf/issues/414) project, which
also generates Rust code from an interface definition.  [This
issue](https://github.com/rust-lang/rust/issues/48457) seems to describe the way
to fix these warnings.

Uh oh.  Unlike the Golang client, which came with tests I could copy, the rust
example just looks like the [generated
files](https://github.com/OpenAPITools/openapi-generator/tree/master/samples/client/petstore/rust)
that I already have.

Well, looks like I just have to figure it out.

## Using The Rust Client Library

I already have the [Rust vim](https://github.com/rust-lang/rust.vim) plugin, but
I'll also install this ["racer" plugin](https://github.com/racer-rust/vim-racer)
because it seems like it'll give me the same auto completion I have in the
Golang vim plugin.

The rust vim plugin freaks out about all the warnings, so I'll fix those.
Fortunately it looks like it'll just involve putting "dyn" in front of a bunch
of types.

Fixing the warnings involved putting `dyn` in front of a lot of things, and
[ignoring some
warnings](https://users.rust-lang.org/t/turning-off-compiler-warning-messages/4975)
for something that isn't yet implemented (this might be a problem later, because
it means some part of the OpenAPI spec isn't implemented in the Rust generator).

Okay, so now I need to figure out how to import the package.  It's called
"openapi" in its Cargo.toml file, and I see that the [`use`
keyword](https://doc.rust-lang.org/reference/items/use-declarations.html) is how
to import things, so let's try that.

```rust
use openapi;

fn main() {
    println!("Hello, world!");
}
```

The Rust plugin complains with "unused import" and complains with "unresolved
import" if I change the name after `use`, so that looks good!

Let's figure out what this package actually exports.  Apparently [I can look in
`src/lib.rs`](https://doc.rust-lang.org/1.1.0/book/crates-and-modules.html#exporting-a-public-interface).  Let's do that.

```
$ cat generated/src/lib.rs
#[macro_use]
extern crate serde_derive;

extern crate serde;
extern crate serde_json;
extern crate url;
extern crate hyper;
extern crate futures;

pub mod apis;
pub mod models;
```

Interesting.  So `apis` and `models` are exported.  Let's see what's in `apis`.
There's a file called `mod.rs` that seems like it has something to do with some
kind of boilerplate packaging/module convention.

```
$ cat generated/src/apis/mod.rs
...
mod request;

mod pet_api;
pub use self::pet_api::{ PetApi, PetApiClient };
mod store_api;
pub use self::store_api::{ StoreApi, StoreApiClient };
mod user_api;
pub use self::user_api::{ UserApi, UserApiClient };

pub mod configuration;
pub mod client;
```

Ok, I might be getting closer.  I notice that Rust is using `::` between names
in sub packages.  Let's try to import that and see what I get.

```
src/main.rs|5 col 5 error 423| expected value, found module `openapi::apis::client`
```

All right, so I'm still only getting at the module.  How do I actually use
something in that package?  If I look at `generated/src/apis/client.rs`, I see
an `ApiClient` definition which matches the naming convention from the Golang
client so I think it's what I want.

Ah, maybe I need to go deeper.

```rust
client = openapi::apis::client::APIClient::new();
```

I get these errors now.

```
src/main.rs|4 col 5 error 425| cannot find value `client` in this scope
src/main.rs|4 col 14 error  61| this function takes 1 parameter but 0 parameters were supplied
```

One just looks like I didn't declare the variable, but the important part is
that these errors show that I'm actually importing it!

I'm also going to install [rusty-tags](https://github.com/dan-t/rusty-tags) to
let me quickly navigate to function definitions, now that I'm actually
referencing the right names.

## The Hyper Rust Http Client

So far I'm just following the compiler errors and trying to supply the correct
argument types to get something working.  The next argument I need is leading me
to a project called [hyper](https://hyper.rs/guides/client/basic/).  It looks
like the generated openapi code uses this as the underlying http client library.

Hyper says in its README: "Hyper is a relatively low-level library, if you are
looking for simple high-level HTTP client, then you may wish to consider
reqwest, which is built on top of this library.".

In fact, I see that the OpenAPI generator can generate a client that uses [Rust
Reqwest
instead](https://github.com/OpenAPITools/openapi-generator/tree/master/samples/client/petstore/rust-reqwest).
I'm this far though, so let's see if I can get this working.

In digging through the docs, I found this [client example for
hyper](https://github.com/hyperium/hyper/blob/0.12.x/examples/client.rs).  The
only problem is that those examples are for `0.12`, and I can see from the
`Cargo.toml` file that the generated client library is on `0.11`.

Sure enough, the `0.11` example looks [completely
different](https://github.com/hyperium/hyper/blob/0.11.x/examples/client.rs).

It does however, have have the "handle" object that I've been looking for from
the argument to one of the functions that I haven't been able to find, so maybe
this will just work!

One of the last errors I got was this.

```
$ cargo run
   Compiling generated-rust-openapi-client v0.1.0 (/home/sverch/projects/generated-rust-openapi-client)
error[E0308]: mismatched types
  --> src/main.rs:12:45
   |
12 |     let client = hyper::client::Client::new(handle);
   |                                             ^^^^^^
   |                                             |
   |                                             expected reference, found struct `tokio_core::reactor::Handle`
   |                                             help: consider borrowing here: `&handle`
   |
   = note: expected type `&tokio_core::reactor::Handle`
              found type `tokio_core::reactor::Handle`

error: aborting due to previous error

For more information about this error, try `rustc --explain E0308`.
error: Could not compile `generated-rust-openapi-client`.

To learn more, run the command again with --verbose.
```

Well, that's actually quite helpful.  Thanks Rust compiler!

After shamelessly bashing away until the compiler was happy, this is what I got.

```rust
extern crate hyper;
extern crate tokio_core;

use openapi;

fn main() {
    let mut core = tokio_core::reactor::Core::new().unwrap();
    let handle = core.handle();
    let client = hyper::client::Client::new(&handle);
    let configuration = openapi::apis::configuration::Configuration::new(client);
    let apiclient = openapi::apis::client::APIClient::new(configuration);
    let petapi = apiclient.pet_api();
    let pet = openapi::models::Pet{
        id: Some(31415),
        category: None,
        name: "myfavoritedoggo".to_string(),
        photo_urls: vec!["http://1.png".to_string()],
        tags: None,
        status: Some(openapi::models::Pending),
    };
    let work = petapi.add_pet(pet);

    println!("Hello, world!");
    core.run(work).unwrap();
}
```

When I tried to run it, I got an error.

```
$ cargo run
    Finished dev [unoptimized + debuginfo] target(s) in 0.06s
     Running `target/debug/generated-rust-openapi-client`
Hello, world!
thread 'main' panicked at 'called `Result::unwrap()` on an `Err` value: Hyper(Io(Custom { kind: InvalidInput, error: NotHttp }))', src/libcore/result.rs:999:5
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace.
```

I think it's [this
error](https://github.com/hyperium/hyper/blob/master/src/client/connect/http.rs#L319),
which might mean that hyper is getting passed a bad URL from the petstore API.

All right, this has been a long one, but I think this is a good stopping point.

## Next Time

I wasn't able to get a Rust client working, but I know that next time I should
probably start with the [Rust
reqwest](https://github.com/OpenAPITools/openapi-generator/tree/master/samples/client/petstore/rust-reqwest)
version of the client, especially since the hyper version is on an old (and
clearly completely different) version of the library.

One of the big takeaways is that the Rust compiler is pretty great in terms of
warnings but I remember this being one of Rust's bragging points (examples
[here](https://twitter.com/b0rk/status/954366146505052160?lang=en) and
[here](https://www.reddit.com/r/rust/comments/8lse7e/rust_compiler_errors_are_appreciated_apparently_d/)).
Apparently there's even a tool to [automatically apply the suggestions the
compiler gives you](https://github.com/rust-lang-nursery/rustfix).  Wow.
