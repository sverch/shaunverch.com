---
layout: post
title:  "Daily Learning Day 1: Golang Project Basics"
date:   2020-06-06 01:00:00 -0500
categories: daily-learning
---
I want to start a daily habit of learning something new each day, because I've
noticed that when I'm focused too much on just doing tasks I miss out on the
kind of thinking that gets to the underlying reason behind things (oh, hey, I've
proven it works now, so I'm done).

Plus, I have some bigger goals for projects/tools that I want to learn so I'm
trying out different things.

Today I'll start small, and just go through the basics of Golang. I already work
on Golang projects, but I want to start over to stay fresh on how to start new
projects from scratch.

Disclaimer, this is mostly for me to practice and is probably a worse version of
the real Golang docs, so I'd recommend using those.

## Getting Started

The [Getting Started Guide](https://golang.org/doc/install) just talks about
installation. I've already installed it, so I'll skip that. I could use a
version manager like [this one](https://github.com/moovweb/gvm), which would be
nice for keeping it up to date, but since installation is just downloading and
extracting a tar file it doesn't seem worth it.

## Go Modules History

Because Google internally has a [giant
monorepo](https://research.google/pubs/pub45424/), Golang initially didn't come
with a real dependency management solution. Why would you need to manage
dependencies if they're all just there in one giant repository?

In fact, [Golang's initial release was in
2012](https://en.wikipedia.org/wiki/Go_%28programming_language%29), but it was
[only in 2018](https://blog.golang.org/versioning-proposal) that go modules, the
now official dependency management solution was announced.

Now, [go projects work more similary to projects in other
languanges](https://golang.org/doc/code.html). You have a `go.mod` file that
specifices much of the project's metadata, and that effectively orchestrates all
of this dependency management.

The one difference is that you specify dependencies using URLs rather than by
using package names that get looked up in a centralized registry. For example,
you'll see many package include paths start with `github.com`. The exception to
this is that packages in the standard library just use the package name.

## Testing

Golang has a [built in test framework](https://golang.org/doc/code.html#Testing)
that reads every file that ends in `_test.go` and runs functions with names that
start with `Test` and have the right signature.

Someone wrote a nice [test generator](https://github.com/cweill/gotests) that
I'll probably use. It's pretty basic. It just takes exported functions
(functions that start with a capital letter in golang are exported) and
generates test stubs for them.

## Conclusion

This was day 1 of a new habit I'm trying to start, but it took longer than I
think would fit into a daily habit. For the rest of this week, I'll aim to go
through one module of the [Golang tour](https://tour.golang.org/list) every day.

I think also picking a specific thing that I know won't take that long before I
start would help cap this to a shorter amount of time.
