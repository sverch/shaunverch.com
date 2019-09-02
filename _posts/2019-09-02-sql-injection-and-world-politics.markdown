---
layout: post
title:  "SQL Injection and World Politics"
date:   2019-09-02 01:00:00 -0500
categories: security politics health
---
From Quay Coffee in Kansas City, MO.

It took me a while to realize this, but now that I'm seeing this connection, I
wanted to write about it.

Have you ever felt upset about something, or worried about something, but no one
around you even acknowledges it's happening?  I'm starting to notice more when
that feeling comes up, because I'm realizing it can happen in areas that at
first might seem completely unrelated.  If you're interested in this concept,
these are examples of [gaslighting](https://en.wikipedia.org/wiki/Gaslighting)
(regardless of whether they're intentional).

Also, yes, I'm actually going to try to connect SQL Injection to World Politics,
just so you know what you're getting into.

<hr>
<br>

## Where's The Fire?

I feel like working in Security/Site Reliability either makes you paranoid, or
attracts people who already are.  Probably both.

Your entire job is to think about everything that can go wrong.  All the time.
If you have the power to fix it, that might be okay.  If everyone around you
also understands and respects the problems, that's even better.

Then there's the worst case scenario: no one cares.  You see the problems and
try to fix them, but they stay.  Not because they aren't solvable, but because
no one acknowledges that a problem even exists.

## A Security Fire

Let's talk about SQL Injection.

If you don't know what SQL Injection is, [this
post](https://security.stackexchange.com/questions/25684/how-can-i-explain-sql-injection-without-technical-jargon)
does a great job of explaining the problem without requiring any background in
databases.

Essentially, it's an exploit that allows anyone with access to your site to run
(inject) arbitrary queries on your database, rather than only the ones you've
programmed into your application.

This is very bad.  Catastrophically bad.  Anyone with access to your site can
now:

- Get access to the records of every other user.
- Steal everyone's password hash (you should [hash your
  passwords](https://www.theguardian.com/technology/2016/dec/15/passwords-hacking-hashing-salting-sha-2)
  so that they can only steal the hash you use to verify the user, not the
  original passwords).
- Modify arbitrary records in the database.
- Delete arbitrary records in the database.

In short, this is equivalent to putting your database on the internet,
completely wide open, and saying "have fun" to anyone who walks by.

So yes.  Very, very bad.

## It's Fixed... Right?

Nope.

According to Akamai's [state of the
internet](https://www.akamai.com/us/en/resources/our-thinking/state-of-the-internet-report/global-state-of-the-internet-security-ddos-attack-reports.jsp)
report for 2019, over 40% of attacks on the financial services industry were SQL
Injection.

While obviously there is some selection bias (the report is about the companies
that were successfully hacked, after all), this vulnerability was [discovered in
1998](https://en.wikipedia.org/wiki/SQL_injection) and is so well known that
[there are open source SQL Injection scanners on
github](https://github.com/Pure-L0G1C/SQL-scanner).

How can it be that there are so many places that are still vulnerable?

## Not In The Contract

I'm sure there are many reasons this is true, but one experience in particular
really put this into context for me.  I was working with a team of contractors
that had recently had a security audit, and they didn't do so well.  The
automated scanners revealed thousands of vulnerabilities.

Surely once they realized this, they had the level of urgency appropriate to the
scope of the problem right?

Wrong.  If you haven't experienced the contracting model, you are lucky.  It's a
broken structure that sets everyone up to fail.  The contractor is only
incentivized to do what's explicitly stated in the contract, which leads to a
bizarre warped shadow of what the writers actually intended.

In this case, the contract listed all the new features, but had no mention of
SQL Injection.  So did all feature development stop to fix this burning fire?
You can take a wild guess.

## Nothing Is Real

Leadership did what they were incentivized to do: they followed the contract.
The people on the team weren't really security people, so they happily accepted
the prioritization that they were assigned.

Meanwhile, I was still going in every day with full awareness of the fact that
the door was wide open.  I spent every day watching people step right over the
fire, walk over to their workbench, and continue to build chairs made of wood.

Then, one normal day, I stopped for a second and thought to myself: "maybe I am
overreacting and it's not actually as bad as I think...".

In that moment I realized the toll this had taken.  Seeing this frightening
problem every day, surrounded by people who didn't even acknowledge it, was
profoundly exhausting.  It had gotten to the point where I felt so worn out that
it seemed easier to reevaluate my perception of reality (which deep down I knew
was true) than to continue.  It was a scary moment.

Spending more time with people who understand security, and working on a team
with people who understand security (which fortunately now I do) helped a lot to
get back to sanity.  In the end, that was the only thing that made a difference.

## A World Fire

So what does SQL Injection have to do with World Politics?

Well, the connection that I made recently is that I feel the same way about SQL
Injection that I do about a lot of world problems right now.

We are facing some huge issues, but acknowledging them sometimes feels like
seeing SQL Injection on that team.  From Climate Change, where we know its
effects will drive [widespread
displacement](https://www.unhcr.org/en-us/climate-change-and-disasters.html) of
people from their homes, but [our own president denies it even
exists](https://en.wikipedia.org/wiki/Political_positions_of_Donald_Trump#Climate_change_and_pollution),
to immigration, where [legal asylum
seekers](https://www.rescue.org/article/it-legal-cross-us-border-seek-asylum)
are being subjected to [cruel and inhumane
conditions](https://www.amnesty.org/en/latest/research/2018/10/usa-treatment-of-asylum-seekers-southern-border/),
but the president is running [Facebook ads to stoke fear about
immigrants](https://www.nytimes.com/2019/08/05/us/politics/trump-campaign-facebook-ads-invasion.html).

I'm not sure what to do about this, but I know from the security work that
finding like minded people helped.

## This Is Real

Fortunately, there are many groups who do acknowledge these problems and are
working to do something about them.  There's a big list of [nonprofits trying to
help people at the border](https://www.nnirr.org/drupal/border-groups), and so
many organizations dedicated to fighting climate change that a [top 50
list](https://climatestore.com/take-action/get-involved/non-profit-organizations-working-on-climate-change)
is actually a thing.

In theory, I want to break out of the filter bubble and acknowledge other
perspectives, but in practice, SQL Injection is still SQL Injection.  The person
who has all your users' passwords doesn't care what you believe.
