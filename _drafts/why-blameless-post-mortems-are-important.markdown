---
layout: post
title:  "Why Blameless Post Mortems Are Important"
date:   2018-11-13 13:23:46 -0500
categories: culture sre
---
Blameless post mortems are one of the most important things to have if you want
a good technology culture.  I have never seen an organization that has a good
technology culture that doesn't understand why these are important.

So I'm going to talk about them here, with specific examples of good and bad
post mortems, and some theory about why they matter.

## The Wrong Way

[The response to the Equifax
outage](https://www.engadget.com/2017/10/03/former-equifax-ceo-blames-breach-on-one-it-employee/)
was a great case study into the wrong way to deal with post mortems.

> Equifax's former CEO (who suddenly retired last week) told the House Energy
> and Commerce Committee that a single IT technician was at fault for the whole
> thing after they failed to install the patch.

So you're telling me that *one single employee* out of [11,000
employees](https://www.equifax.com/about-equifax/company-profile/) was able to
single handedly take down one of the [three largest credit bureaus in the United
States](https://en.wikipedia.org/wiki/Credit_score_in_the_United_States#FICO_score).

Now that is what I call phenominal cosmic power.

![Genie from Aladdin with phenomenal cosmic power but an itty bitty living
space](https://media.giphy.com/media/6CA5k1eHBechO/giphy.gif)

TODO: Self host this gif?

## System Safety

To see why this is not just misguided, but actively harmful, we have to look at
a concept called [System Safety](https://en.wikipedia.org/wiki/System_safety).

## The Right Way

[The Gitlab database
outage](https://about.gitlab.com/2017/02/10/postmortem-of-database-outage-of-january-31/)
is an example of a good post mortem.
