---
layout: post
title:  "Can The Cloud be Butter?"
date:   2023-01-01 01:00:00 -0500
categories: cloud butter
---
Can it be The Cloud, but Butter? That's my question. I don't know if this is
possible, but I want to share my idea of Butter to see if other people also want
this kind of Butter.

## But What is Butter?

One day, I wake up. I have heard lots of stories about The Cloud, and I want one
of my own The Cloud.

So I stumble out of bed, walk over to my local Computer Store, buy some prebuilt
desktop computing machines and plug them in.

Then I install my favorite Linux distribution, Hannah Montana Linux.

Finally, I install an agent on each machine.

Then BAM! I have an API that lets me provision private networks and Virtual
Machines, but those Virtual Machines are completely unawares that they are
running on a computer under my bathtub.

I think that would be Butter.

## So Butter means doing Everything?

No. Just VMs and private networks. The point of Butter is Easy. When you wake up
in the morning you don't want to spread Kubernetes all over your toast. Gross.

## So how is Butter?

Finally, someone asks how is Butter.

Well, Butter has a few things going on. Let's meet some friends.

## KVM Is Butter

First, we need some way to actually run Virtual Machines. KVM is Butter. This
gives us a way to run virtual machines at bare metal speeds on linux.

## Wireguard Is Butter

Now, we need a way to create private networks. Wireguard is Amazing, and also
Butter. [This talk is one of the best tech talks I've ever seen, and I'd
recommend checking it out!](https://www.youtube.com/watch?v=88GyLoZbDNw).

![Check it out!](/assets/images/check-it-out.jpg){: width="50%" }

## Can they be Butter Together?

This is my question. I know each of these things can be Butter individually, but
what is better than Butter amongst friends?

When you create a Wireguard network, the machine knows. The machine sees that
magical `wg0` interface, and all is good.

But we don't want to tip off our unsuspecting Virtual Machines. We don't want
them to get nervous about running on that ten year old hard drive we found in
our uncle's attic.

So, how can we all become masters of disguise? How can we put on an `eth0`
costume and appear to look like an innocent, totally real, physical, ethernet
interface? How can we secretely steal the packages of our unsuspecting
houseguests, and send them on a magnificent journey to our other unsuspecting
houseguests?

The closest I've found to this level of organized crime is the [Cilium Wireguard
plugin for transparent encryption on
Kubernetes](https://docs.cilium.io/en/v1.12/gettingstarted/encryption-wireguard/),
but I already told you, I don't want Kubernetes on my toast. Get outta here.

I think there's some way to do this, but I don't have that rube goldberg machine handy at the moment.

## Why?

Because I want The Cloud without any Work, and I want it to be easy for everyone
to have The Cloud without any Work too.

Also, because I don't like systems that retain special powers "internally" (i.e.
not exposed via the API), so they can build products with those special powers
and then sell them back to you. I want an API that lets me do whatever I want
([ECMP](https://en.wikipedia.org/wiki/Equal-cost_multi-path_routing) is also
Butter, and not a Butter that many people will allow you to have).  I wonder if
I can build more complicated things "outside the API", if the right tools are
there, but I don't think anyone has a reason to do that! Why turn off the Money
Funnel when you have it already?

Thanks for reading to this rant. If you find this interesting, and want to talk
about it, please let me know! Just email dangthatsbutter@shaunverch.com.
