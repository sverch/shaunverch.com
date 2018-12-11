---
layout: post
title:  "The New Mainframe"
date:   2018-11-13 13:23:46 -0500
categories: cloud mainframe vendor-lock-in
---
It's 1964, and IBM has just released the System/360:
https://en.wikipedia.org/wiki/IBM_mainframe#IBM_System/360 (MAINFRAME).  The
marketing talks about how much the mainframe can do and how it is the future
https://www.ibm.com/ibm/history/exhibits/mainframe/mainframe_PR360.html.

Well that didn't happen.  It's 2018 and mainframe is synonomous with "old",
"stuck", and "expensive".  But fortunately we'll learn from our mistakes and not
fall into the same trap, no matter how shiny it is...right?  Maybe.

## What is a mainframe?

It may seem obvious to say this, but at the end of the day, a mainframe is just
a computer, with one main difference: vendor lock-in.

You might be reading this on a browser made by Google or Mozilla, in an
operating system made by Apple, Windows, or Linux, all running on a chip made by
Intel or AMD.  Each layer of the stack has a published and standardized
interface that other companies or organizations can build against.  This means
that we have more choices as different companies compete on every level.

There's a non zero amount of work, to coordinate this though, and sometimes
there are miscommunications and incompatibilities.  On top of that, you don't
always have one group to call if something goes wrong.

So now imagine someone comes along and tells you that they can solve all your
problems for you in one wonderful device.  Since one company builds the
hardware, operating system, and software, everything is guaranteed to work
together.  For an organization that doesn't have a lot of technical expertise,
but has a lot of money and knows the stakes are high, this proposition is very,
very appealing.  And there you have a mainframe (and why some people still like
them).

## What have we learned?

While mainframes seemed like a good short term business investment at the time,
today we know better.  We can deploy robust applications worldwide in a tiny
fraction of the time at a tiny fraction of the price using modern tools and
commodity hardware.

And those mainframes?  They're still around.  The top to bottom proprietary
integration makes incremental upgrades difficult, if not impossible.  If your
code depends at all on mainframe features, you're stuck.  Those features depend
on the mainframe operating system, which depends on the mainframe hardware,
which means you'll be paying a lot of money for a long while.  None of it was
designed to be swapped out because there was never any financial incentive to do
that.

Note: They are not declining, but this shows the downsides:
https://www.forbes.com/sites/forbestechcouncil/2018/07/06/guess-what-mainframe-use-is-growing-but-challenges-remain-unsolved/

Even though mainframes are gradually declining (SOURCE), this type of lock-in
won't go away because it's way too profitable.  Besides the obvious things like
phones that can only run the operating system made by the company that sells
them, and operating systems that can only run on laptops made by one company,
there's another place where this pattern is showing up again: cloud providers.

## How could the cloud become the new mainframe?

When the idea of the cloud first started catching on back in (YEAR), it was
based on a simple idea: companies that had excess computing power and had
already built datacenters could sell that computing power to other people for a
"rental fee".  At the time, customers would buy virtual machines that looked a
lot like the physical hardware they were used to.

At that time, you pretty much had to do everything in the software stack
yourself.  You bought the machines, but you had to deal with monitoring,
logging, high availability, security, and everything else that comes with
deploying software in production.  Then in (YEAR), AWS released their (FIRST
PRODUCT), and things started to change.

Note the "Amazon Certified Engineer" and how that affects the market.

Now it's 2018, and AWS and Google have (X NUMBER) of proprietary software
offerings, from load balancers to closed source databases.  These services are
where the money really is, because most people don't want to set these things up
themselves.  You can pay the cloud provider to deal with everything for you
behind the scenes, and you never have to think about it.  Sound familiar?

Fortunately, we don't have to repeat past mistakes, and there are things we can
keep in mind to avoid falling into the same trap as last time.

## How can we write cloud agnostic applications?

Ultimately, the thing that will save us is in my opinion the single most
powerful idea in computer science: abstraction.

*You don't have to build everything from scratch yourself and turn up your nose
at the often quite useful services your cloud provider offers to build your
application in a more cloud agnostic way.*  Software always involves tradeoffs,
and ultimately good engineering is understanding where to make compromises, and
that includes compromises in portability.

The real shift comes in how you think about the services offered by the cloud
provider.  Don't think of the services as the specific products, try to think
about what the thing is actually trying to be.  You're not using s3, you're
using a blob store.  You're not using DynamoDB, you're using a document store.

If you think about it this way, you can understand what it would take to
implement it yourself, and in the end probably understand more about why you
need it in the first place.

This is why I created a directory of open source equivalents at
[https://getcloudless.com/open-source-equivalents/](https://getcloudless.com/open-source-equivalents/).
If you see anything wrong there or have any ideas for yourself, please submit a
pull request!

## What about Docker/Kubernetes?

I have to put this in here, because I know someone will ask about it.  Docker is
great, and solves a specific problem: packaging.  It's like a Java fatjar or
python pex, but portable across all languages.  It's a good example of this way
of thinking.  You just want packaging, and Docker happens to be a good way to do
it.

Kubernetes is another example.  Kubernetes is a solution to a specific problem:
container orchestration.  You can use it to manage your container based
deployments and schedule your containerized applications across a cluster.
Mesos (which came in (YEAR)) is another solution for the same problem.

Nothing is the solution to all your problems, and the more we can all keep that
in mind, the better protected we'll be against our past mistakes.
