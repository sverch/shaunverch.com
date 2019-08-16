---
layout: post
title:  "Terraform Lessons Learned"
date:   2019-08-15 15:00:00 -0500
categories: terraform architecture
---
These are some lessons that my coworkers and I learned on a project that used
Terraform in 2016.

For historical purposes I made no changes to this list (besides trying to find
some of the missing links).  Some minor specifics are dated though, so I made a
section at the end for what I know is no longer true.

These are rules that we found are important to follow when using Terraform to
avoid building an unmaintainable system.  In three more years of using Terraform
I can confirm these still hold true.

<hr>
<br>

## Terraform Lessons Learned

This details some of the lessons learned from using Terraform.

### Terraform Introduction

Terraform allows you to declaratively describe AWS resources, and then
idempotently provision these resources. It does this by keeping track of the
state of all your AWS resources in a JSON file that can be stored in s3
alongside your infrastructure. When you apply terraform changes it checks this
state file against your declared configuration and applies only the delta to get
your AWS resources in sync with your current configuration.

### Lesson 1: Do Not Use Environment Variables

#### The Issue

Terraform supports "variable" blocks, which can be used as input parameters to
set things like environment specific options and change the behavior of the
configuration. [These can be set in a number of
ways](https://www.terraform.io/docs/configuration/variables.html), but for the
sake of expediency, environment variables were used heavily on this project.
This caused a number of issues. First, since the environment variables were not
version controlled, this meant that no one besides the original person who
worked with an environment could safely make changes to it.  Second, environment
variables can be brittle and error prone, and encourage keeping important
infrastructure state on developer laptops. Finally, because these environment
variables could be set in a shell script, this allowed dynamic logic to leak
into an otherwise statically declared infrastructure configuration.

#### The Solution

In this case, all environment variables were committed into version control, and
hidden behind a deploy script. Each environment (dev, prod, etc.) had its own
environment variable configuration file. This allowed us to make the environment
builds more deterministic and reproducible between different people on the team.

For new Terraform projects, there are cleaner options to achieve this, such as
[using modules to store the business
logic](https://www.terraform.io/docs/configuration/modules.html), and a small
stub configuration that consumes the modules and sets the per environment
configuration. Some of these options can also be stored in a [".tfvars"
file](https://www.terraform.io/docs/configuration/variables.html#variable-definitions-tfvars-files).

Terragrunt seems to remove the need for a stub configuration, and lets you
deploy an environment using only [module references and a “.tfvars”
file](https://github.com/gruntwork-io/terragrunt#quick-start).

### Lesson 2: Do Not Manage Secrets With Terraform

All configuration you pass to Terraform gets stored in the Terraform state file.
This is a security risk, as everyone who has the ability to even run a Terraform
plan will have access to those secrets.

Some resources, like the RDS database, require a password argument, so tools
outside Terraform are needed to ensure that this password gets changed, and that
monitoring will detect default passwords on databases.

### Lesson 3: Do Not Use Provisioners

Terraform provisioners allow you to execute scripts on a [remote machine while
it’s being
created](https://www.terraform.io/docs/provisioners/remote-exec.html). Do not
ever use this.

While in theory it seems convenient, in practice it creates dangerous coupling
between your base infrastructure and Terraform.

This project in particular relied heavily on the chef provisioner, and a
Terraform run would be responsible for fully configuring every instance in the
infrastructure. This meant that a bug anywhere in the stack, including the rails
app, would cause the entire infrastructure deployment to fail.

Decoupling this by running chef via a cloud-init script in an auto scaling group
allowed infrastructure deployments to succeed even if the instance configuration
was broken, and allowed instances to be redeployed without an invasive
infrastructure change.

### Lesson 4: Use Modules Even When It’s Painful

This project did not initially use any Terraform modules, and all Terraform
configuration was in a single directory.

Using Terraform modules can sometimes be painful, as it has some strange
behavior and doesn’t support some important pieces of the Terraform language
(NOTE: This might be better now, see [2019 Updates](#2019-updates)).  This was
the main reason modules weren’t used here.

However, the benefits of using modules outweigh this difficulty. In addition to
making components reusable and reducing duplication, it makes your architecture
self documenting, and in practice leads to a more modular infrastructure that it
is easier to swap individual pieces in and out of safely.  Some examples of
things that make good modules:

- Base networking setup.
- Encrypted S3 Bucket with access logs.
- ELB/ALB with access logs.
- Cloud-init configuration.
- Auto scaled service.
- Database service.

Each module should be usable on its own, and provide a clear abstraction (e.g.
this auto scaled service can be accessed at
`https://<service>.<environment>.internal`, and the module ensures that’s true).

### Lesson 5: Terraform Interpolation Is Angry Cats

Terraform has its own home grown [interpolation
language](https://www.terraform.io/docs/configuration/index.html). This has some
bizarre behavior sometimes, and I don’t have any great solutions for it, other
than to try to hide the badness in modules and add comments.  In particular,
[booleans are especially strange](https://stackoverflow.com/a/56968475).
Terraform doesn’t support native booleans (NOTE: Now they do, see [2019
Updates](#2019-updates)), so unquoted true or false turn into 1 and 0
respectively, while quoted true or false turn into strings. Can you guess what
environment variables turn into?  Don’t use environment variables.

### Lesson 6: Make Your Cloud-Init Scripts Dumb

It’s much harder to test and maintain a complicated cloud-init script than it is
to maintain the actual code that configures the instance.  For instance
configuration, there are tools such as
[test-kitchen](https://docs.chef.io/kitchen.html) and
[vagrant](https://www.vagrantup.com/) that can create and provision an instance,
and these tools integrate with [serverspec](https://serverspec.org/), which can
be used to verify that the instance is configured correctly.  Any logic in
cloud-init is difficult to test with these tools, and also creates a race
condition between the cloud-init script and the provisioners that get run by the
tools themselves. The more the instance configuration knows how to set up and
configure its own dependencies, the better.  An even better model would be to
not have cloud-init scripts at all, and instead pre bake the AMI and give all
services the ability to download their own secrets on startup.

### Lesson 7: Reduce Blast Area

Use separate state files for different environments. You will screw up your
state file at some point and need to do state file surgery or risk losing the
whole environment. It’s much better to isolate this to the smallest damage
possible.

### Lesson 8: Use Plugins At Your Peril

You might be tempted to use terraform plugins, like terraform-acme. But think
very carefully about how robust and well tested they seem to be. Since Terraform
is a pre 1.0 product, its internals change very quickly and plugins can break in
surprising ways.

### Lesson 9: Versioned State

Whatever backing store you use for terraform state, be sure it is versioned so
you can recover old versions. For example, in S3 turn on object versioning.
Ideally turn on Terraform locking as well.

## 2019 Updates

Here are a few corrections for 2019.

- Terraform 0.12 actually [has booleans
  now](https://www.terraform.io/docs/configuration/variables.html#bool).
- Modules may be more usable now and support most features of the language.  At
  the time, I believe you couldn't pass certain variable types to modules that
  you could use in normal resources.
- Rather than using test-kitchen and vagrant, I've moved more towards
  [molecule](https://molecule.readthedocs.io/en/stable/) and
  [docker](https://www.docker.com/) for testing instance configuration.
- I'm not aware of the current state of the plugin ecosystem (although Terraform
  is still pre 1.0 for whatever that's worth).
