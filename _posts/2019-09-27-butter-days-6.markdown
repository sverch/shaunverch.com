---
layout: post
title:  "Butter Days: Day 6"
date:   2019-09-27 01:00:00 -0500
categories: butter open-source
---
This is Day 6 of [Butter Days]({% post_url 2019-09-20-butter-days-5 %}), from
Hub Ned in Nederland, CO.

Last time I [created a pull request against
awscurl](https://github.com/okigan/awscurl/pull/69) to split up the signature
generation stages for AWS.

My ultimate goal is to generate a Rust OpenAPI client that connects with AWS,
generated from the [AWS openapi
specs](https://github.com/APIs-guru/openapi-directory/tree/master/APIs/amazonaws.com).

To do that, I need to figure out how to generate the AWS specific signed headers
in rust, and how to properly pass them into the generated OpenAPI client code.

See [Day 1 of Butter Days]({% post_url 2019-08-23-butter-days-1 %}) for context
on what I'm ultimately trying to build.

<hr>
<br>

## OpenAPI Client Headers

I know from last week that everything about the special AWS signature is sent
via request headers, so let's figure out how to set them in the generated client
library.  Since the client I generated is based on the `reqwest` library, I'm
going to start there.

From [the reqwest
docs](https://docs.rs/reqwest/0.9.20/reqwest/struct.Client.html), this is the
only mention of headers:

```
pub fn request<U: IntoUrl>(&self, method: Method, url: U) -> RequestBuilder

Start building a Request with the Method and Url.

Returns a RequestBuilder, which will allow setting headers and request body
before sending.
```

Sure enough on the
[RequestBuilder](https://docs.rs/reqwest/0.9.20/reqwest/struct.RequestBuilder.html)
docs I see an example of setting the headers.  Let's just search the generated
code for "headers" to find out where this is done in that library:

```
$ grep -R header generated/src/
generated/src/apis/pet_api.rs:            req_builder = req_builder.header(reqwest::header::USER_AGENT, user_agent.clone());
generated/src/apis/pet_api.rs:            req_builder = req_builder.header(reqwest::header::USER_AGENT, user_agent.clone());
generated/src/apis/pet_api.rs:        req_builder = req_builder.header("api_key", api_key.to_string());
...
```

Looking at that code, I see:

```rust
if let Some(ref user_agent) = configuration.user_agent {
    req_builder = req_builder.header(reqwest::header::USER_AGENT, user_agent.clone());
}
req_builder = req_builder.header("api_key", api_key.to_string());
if let Some(ref token) = configuration.oauth_access_token {
    req_builder = req_builder.bearer_auth(token.to_owned());
};
```

This actually isn't looking good.  If the `api_key` is part of the generated
code, and all the headers are baked in, that means that this is a place where
the OpenAPI spec is opinionated about authentication.  Since the AWS signature
method isn't really a standard thing, that means I might have to do something
messy.

Normally, I might try to set "default headers" on the client object, but since
the AWS signing process involves you actually signing the request itself, that
won't work here.  I have to somehow intercept this when the request is about to
go out.

Looks like in the Swagger specification you can define [custom
headers](https://swagger.io/docs/specification/describing-parameters/).  That
makes sense actually if you think of headers as part of the request format.

This means I'll have to define that in the swagger spec to see the generated
code, or use a spec that has custom headers defined.

## A Custom Client

(lunch sounds)

I discussed this with a friend over lunch, and it's clear now that even setting
custom headers won't work.  This is again because in the AWS signature process,
the request itself is actually signed which means they must be calculated right
at the end, and I think the custom headers are set earlier in the process as
part of building the request.

Fortunately, the configuration struct allows overriding the client:

```rust
pub struct Configuration {
    pub base_path: String,
    pub user_agent: Option<String>,
    pub client: reqwest::Client,
    pub basic_auth: Option<BasicAuth>,
    pub oauth_access_token: Option<String>,
    pub bearer_access_token: Option<String>,
    pub api_key: Option<ApiKey>,
    // TODO: take an oauth2 token source, similar to the go one
}
```

Maybe that means I can pass in a client wrapper that calculates the proper auth
headers right before the request is actually sent out.  This would save me from
having to modify generated code.

I'm going to dig into [this code in the rust aws
client](https://github.com/rusoto/rusoto/blob/master/rusoto/core/src/signature.rs)
to see if there's a client object I can pull out of it that does this already.

Unfortunately [rusoto core uses hyper rather than
reqwest](https://github.com/rusoto/rusoto/blob/master/rusoto/core/Cargo.toml#L33),
which is not surprising, but unfortunate given that [I tried generating the
hyper client]({% post_url 2019-09-06-butter-days-3 %}) and ran into issues with
it being very far out of date.  I don't have much hope that will be compatible
with the reqwest based client.

## Hyper Versus Reqwest

Now I have two options.  I could try to upgrade the openapi generator for hyper
to generate a client based on a hyper version that matches the one rusoto uses
and then hope that the client in there is compatible, or I could try to write a
wrapper around a reqwest client that adds the right headers right before the
request goes out.

Either way I'm doing the same thing.  It just depends on which I want to write.
In one case I need to update a lot of the openapi code generator for hyper,
while in another case I need to write a wrapper and potentially reimplement some
aws signature generation code that's already in rusoto.

Since I'm already this far into reqwest, I'm going to stick with that.  Maybe
I'll still be able to reuse the [signature code from
rusoto](https://github.com/rusoto/rusoto/blob/master/rusoto/core/src/signature.rs)
somehow.  I definitely want to avoid reimplementing logic like that, which
probably has a lot of hard learned lessons, but I'm okay with adding a bit of
ugly glue.  I'd probably need that anyway in the hyper client.

Okay, so let's first understand what we would need to do to intercept the
request.  Looking at `generated/src/apis/pet_api.rs`, I see this at the end of
all the functions:

```rust
client.execute(req)?.error_for_status()?;
```

Looking further, I see this in the request object:

```rust
impl Request {
    ...
    /// Get a mutable reference to the headers.
    #[inline]
    pub fn headers_mut(&mut self) -> &mut HeaderMap {
        self.inner.headers_mut()
    }
    ...
}
```

This makes me think that if I override the `execute` method on the client to add
the headers and call the real `execute`, that would give me what I want.

## Looking for Hooks

Sometimes libraries like this let you insert `hooks` at various stages of the
process, essentially to do exactly what I'm trying to do.

Sure enough, a search for "rust reqwest change headers middleware" returns [this
logging issue](https://github.com/seanmonstar/reqwest/issues/87), where someone
is trying to add a `pre_send` hook.

Unfortunately, there's a reason my search returned a random pull request.  That
was just some example code that isn't actually in the library.

I tried looking in a few other places, like the `Client` and the
`RequestBuilder` and didn't find anything that looks like hooks.  At the end of
the day, I think I have no choice but to do this override.

This is all because of AWS's insane signing process.  I don't know why they did
it this way.  In theory, it's to ensure that the request hasn't been modified,
but that's actually unnecessary.  First of all, everyone should be using TLS,
and second of all, if TLS doesn't guarantee the integrity of your request then
security is an illusion and we have worse problems than one company's api
requests getting modified.

## The Reqwest Wrapper

All right, so let's try to write a simple Client that wraps the reqwest client.
First, let's generate a new project:

```
$ cargo generate --git https://github.com/rust-cli/cli-template.git --name reqwest-wrapper
 Creating project called `reqwest-wrapper`...
 Done! New project created /home/sverch/projects/reqwest-wrapper
```

I couldn't remember how I got this client working, so I just stole my code from
a [previous post]({% post_url 2019-09-13-butter-days-4 %}).

From there I was able to change things around until the reqwest code from that
post worked in the main function of the code that was generated.

The main error I got was this one:

```
   Compiling reqwest-wrapper v0.1.0 (/home/sverch/projects/reqwest-wrapper)
error[E0107]: wrong number of type arguments: expected 1, found 2
  --> src/main.rs:25:25
   |
25 | fn main() -> Result<(), reqwest::Error> {
   |                         ^^^^^^^^^^^^^^ unexpected type argument

error: aborting due to previous error

For more information about this error, try `rustc --explain E0107`.
error: Could not compile `reqwest-wrapper`.

To learn more, run the command again with --verbose.
```

It only was there when I imported `std::io::Result`, so there's probably
something about scoping and name overrides that I don't fully understand.

The more I'm looking into this, the more I'm realizing that I don't actually
know how to override the object methods in such a way that the generated code
would call it.  Rust [polymorphism works differently from other
languages](https://doc.rust-lang.org/1.8.0/book/traits.html).  I don't think I
can just inherit from `reqwest::Client` and have it work.  The library would
have to be implemented to say "I take objects that implment the Client trait",
but it takes a `reqwest::Client` directly.

All of this mess shows me that I'm going in the wrong direction on this.  Time
to zoom out and rethink the approach.

## The Real Answer

So far, I've learned that this is a lot more complicated than I first expected.
Why is it so complicated?  What's the real solution here?

Ultimately, what I want (and what would be the cleanest answer) would be to have
the generator generate a client that includes the AWS signing process.  This
would match the way other authentication methods work, because they are [built
into the spec](https://swagger.io/docs/specification/authentication/).  Trying
to shoe-horn it in after the fact is not the right way.

Then there's the next question.  How can I get the generator to generate this?
Well, at this point it starts getting bad.  To generate this, I'd either have to
write extensions to the generator that are not compatible with OpenAPI, or get
the AWS signing process into the OpenAPI spec itself.  This seems wrong, one
because it would never happen, two because the AWS signing process is some
proprietary thing that AWS came up with, and three because it's just plain bad.

If trying to shoe-horn something into the client after its generated is a dead
end, and trying to generate the client in a way that it can do this is a dead
end, what does that leave us?

Well, it leaves us the unavoidable truth about why this is difficult.  The AWS
API is not compatible with OpenAPI, at the very least because of this signature.

So now, knowing where the issue is, where the bad code is, we can change our
frame.  What do I usually do with bad code?  I try to put it in a very small
box, and hide it from the rest of the system.

Given that, the next thing I'm going to try is to create a proxy that has one
job:  It will accept requests destined for the AWS API and attach the proper
signed headers to them on the way out.

Most importantly, it will actually be an OpenAPI compliant server, at least from
the perspective of the client.  I think this is the best way, because it will
give us support for all languages for free.  I will actually be able to generate
any language client directly from the OpenAPI spec and immediately use it
without modification, as long as I hit this proxy first.

## Next Time

Today was a marathon of running into walls, but at least it made it abundantly
clear that I'm taking the wrong approach to this problem.  I wouldn't have
thought the proxy was the right way before, because in theory it requires
running a separate process, but I think a few things make me more confident it's
the right way to go.

First, thinking of AWS as a non compliant API makes it clear that there has to
be some shim, and the question becomes where that shim should go.

Second, a library that can take a request object and return a request object
with the signed headers is really the lowest common denominator.  No matter
where the shim goes that's what I'm ultimately doing.

Finally, putting it at the API layer first seems right because I get support for
all languages for free.  Even if I don't like the fact that it's acting as a
proxy, I can probably retroactively use the same library that powers the proxy
inside any particular client library with some extra effort (maybe with pipes,
maybe with a foreign function interface).

So that's it.  Next time I will be implementing a function in rust that takes a
Rust Request object and adds the signed headers to it.  I can reuse some of my
work on the [awscurl library]({% post_url 2019-09-20-butter-days-5 %}) and try
to factor out some of the [signature code from the rusoto
client](https://github.com/rusoto/rusoto/blob/master/rusoto/core/src/signature.rs).
Then I'll try to stick that into a proxy.  [Fortunately someone's already posted
about proxies in
Rust](https://medium.com/swlh/writing-a-proxy-in-rust-and-why-it-is-the-language-of-the-future-265d8bf7c6d2),
so I can copy liberally.

Anyway, not every day can have a huge success, but at least now I know the
truth.
