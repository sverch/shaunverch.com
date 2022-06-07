---
layout: post
title:  "Investigations Into Yubikey For SSH"
date:   2021-11-13 13:33:14 -0500
categories: security
---
I ordered some Yubikeys a while back intending to set them up for SSH, but
because what appeared to be the accepted way to do that at the time seemed to be
quite involved, I never got around to it. However, it looks like there are some
new changes that make this easier, so I'm going to try to write down where
things are now.

## 



Steps did exist to set this up, but my defense mechanism for software complexity
is to avoid doing things manually at all costs, or when I do, make sure I
document every step carefully and only do exactly what I've documented. So when
there isn't a single tool that I can use, that's already in version control,
that means even if something has a few manual steps it already explodes what I
consider the minimum amount of time I can spend on it until I'd consider it
done. It's a bit overkill probably, and is definitely limiting sometimes, but
it's a habit that I want to keep.



the
mental barrier to do that felt a bit high. Not crazy high, but more that it
wasn't as simple as using a project that automated everything.



Part of this was because the guide to do this at the time was
a bit involved, and anytime something is a bit involved is a signal to me that
it might change and I might have to invest more time in it.



https://github.com/drduh/YubiKey-Guide


https://github.com/drduh/YubiKey-Guide


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
