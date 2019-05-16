---
layout: post
title:  "Infrastructure Configuration is not Infrastructure as Code"
date:   2018-11-13 13:23:46 -0500
categories: cloud tools devops
---
People talk a lot about "Infrastructure as Code", but I think that a lot of
things that get referred to as "Infrastructure as Code" are actually just
"Infrastructure Configuration" in disguise.

It may seem like it's just being pedantic about names, but the difference
between these has profound implications on everything from culture to
maintainability.

# What is Code?

Code is *dynamic*.  Code does things and responds to things.  Code is what
actually makes things happen, and is the only thing that actually automates away
what would otherwise be human tasks.

# What is Configuration?

Configuration is *static*.  Configuration describes what something is.  Most
importantly, configuration must be curated somehow, either by a human or by
software.  Configuration is not capable of maintaining itself or automating
anything, it's just a way to describe something, and the code has to actually
read or write configuration to make something happen.

# Why does this matter?

Whether you are writing code or configuration completely changes how you
approach your infrastructure.

If you are writing code, your goal is to build something becomes more resilient
and self sustaining over time through all the usual good software development
practices.

If you are writing configuration, you are making a decision that you want to
maintain it.  You are trading the ability to someday remove yourself from the
process of provisioning servers in favor of you yourself being able to specify
exactly how many servers there are at every moment.

To make this concrete, I'll compare two different paradigms for infrastructure
development, [Terraform](https://www.terraform.io/), and [Kubernetes
Operators](https://github.com/operator-framework/awesome-operators) (similar to
[Mesos Frameworks](http://mesos.apache.org/documentation/latest/frameworks/) but
that wasn't written by Google).

# Terraform: Infrastructure Configuration

Terraform lets you define resource blocks that look [like
this](https://www.terraform.io/docs/providers/aws/r/instance.html):

```terraform
resource "aws_instance" "web" {
  ami           = "${data.aws_ami.ubuntu.id}"
  instance_type = "t2.micro"

  tags = {
    Name = "HelloWorld"
  }
}
```

When you run Terraform, it reads all your resource blocks and one by one makes
sure every resource block is synced with a resource deployed in your backing
cloud provider.  This means that for everything you have deployed you have a
corresponding Terraform resource block spelled out somewhere (maybe hidden in a
module or part of a resource with a "count" to deploy more than one, but that's
the core idea).

So now imagine you go all in on Terraform.  It gives you such fine grained
control after all!

You happily write out all these configuration files.  You define your entire
infrastructure, every subnet and vpc and instance and autoscaling group is
meticulously defined one block at a time to explicitly specify the state of your
entire infrastructure.  Not a firewall rule gets configured without you knowing
about it.

Now write a dashboard to automatically provision various parts of your
infrastructure.  Oh wait...  I guess now you have to automatically generate
Terraform code.  What if it fails to apply?  Well...  You can try to parse the
error message, but it's not like one function fails, the entire run either works
or it doesn't.  So that's a problem.

Ok, well now make it multi cloud.  Whoops.  Now you have to define a one to one
mapping for every resource in the other cloud provider.  Do they behave the
same?  I don't know.  You could wrap it in functions if this was actual
software, but it's not, it's configuration.

That's really the core of it.  You define your infrastructure with Terraform,
writing out resource blocks, but you don't call it *software* because it's not.
It's a convenient way to curate your cloud resources, which is fine if you want
to be the curator, but if, like any good software engineer, you're trying to
automate yourself out of a job, this is a dead end.

On top of all that, if you want to keep your infrastructure in sync, you have to
write all that code yourself.  Terraform won't do it for you.  It's just a set
of configuration files and a tool to sync your configuration with the cloud
state.  So if you want to build automation that keeps your environments up to
date, that's up to you (and in my experience, Terraform, as a tool built with
human operators in mind, fights you every step of the way).

# Kubernetes Operators: Infrastructure as Code

Note that these aren't the only pieces of software that think this way, but they
are good examples (and popular right now).

A Kubernetes Operator is an agent that sits on your cluster, listens for
creation of specific "custom resources" that it manages, and then does whatever
it needs to do to make that happen properly.

Take the [Prometheus Operator](https://github.com/coreos/prometheus-operator) as
an example.  To use it, you deploy it on your cluster and then start creating
custom "Prometheus" resources.  The operator will handle these and not only
ensure that Prometheus is running, but also handle making sure it stays running
and deal with various other operational tasks required to manage Prometheus in
production.

That's completely different.  There's no one to one mapping.  There isn't a
resource declaration for every single thing deployed on the cluster.  You
provide an abstract definition of what your end goal is, and the software makes
it happen.

This doesn't have to be Kubernetes specific (see earlier mention of Apache
Mesos).  Why couldn't you make an operator for instances instead of containers?
Well you can, and it's called [Spinnaker](https://www.spinnaker.io/), a project
by Netflix that does exactly that.  They knew what they actually needed to
scale, and it was software that safely managed deployments, not configuration
that their team had to curate themselves.

# So what does this mean?

It means to pay attention to the outcome you want, and go in with eyes wide
open.

If you like controlling every attribute on every single resource that you've
deployed, and you want to, as a human, keep those up to date, then
Infrastructure Configuration may be right for you.

This isn't all bad, if you're a small shop and just have one node that you want
to manually curate, then it's great!  No moving parts and it's just making it
easier to keep track of what you changed.

But, if you want to actually have a scalable infrastructure, and hope to ever
reach the true power of good software engineering (which the big tech companies
know, of course), then true "Infrastructure as Code" isn't just defining
configuration files.  It's building software with behaviors, and behaviours that
you can rigourously test and reproduce.

Then you may actually be able to someday automate yourself out of a job (or
better, start a company).
