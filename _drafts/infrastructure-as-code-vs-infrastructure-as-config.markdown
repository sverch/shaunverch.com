---
layout: post
title:  "Infrastructure as Code Vs Infrastructure as Config"
date:   2018-11-13 13:23:46 -0500
categories: cloud tools devops
---
There's a big difference between infrastructure as code and infrastructure as
configuration, or specifically, configuration files.

Code implies that your infrastructure is dynamic and meant to change.

Configuration files imply that you have configured something a certain way and
there's some curation involved to keep that configuration up to date.

This seems like it's not a big deal, but if you think of how we treat these
differently, you can see big implications for infrastructure culture.

Do we test configuration files?  No, we test behavior.  We test the outcome of
running our automation.

Granted, some things should be declarative, but state should never be
declarative.  Only what something is should be declarative, not how many of
them there are or whether it has even been created at all.  That's a path to
manual curation and the old sysadmin mindset.
