---
layout: post
title:  "Operator SDK and Kind"
date:   2022-11-22 10:00:00 -0400
categories: kubernetes kind operator-sdk
---
The [Operator Framework](https://sdk.operatorframework.io) is a tool for
deploying services that are themselves composed of multiple services. I want to
learn more about this, so I'm trying to set up a good local environment that I
can use to play around with it.  I wanted to share it here in case it helps
someone else, and to solidify what I've learned. I'll start by describing some
of the important tools to know about for anyone who isn't familiar with them,
and then go into the setup.

# What Is Kubernetes?

[Kubernetes](https://kubernetes.io/docs/concepts/overview/) is a tool that
manages the deployment of applications on a distributed cluster of machines,
where the applications are packaged and run as [Docker
Containers](https://www.docker.com/resources/what-container/).

# What Is The Operator Framework?

Kubernetes by provides some built in tools for deploying applications. The most
basic unit is a [Pod](https://kubernetes.io/docs/concepts/workloads/pods/),
where you tell Kubernetes that you want to run a specific application with a
certain amount of memory and CPU time, and Kubernetes will find a place in your
cluster to run your application.

However, realistic applications run multiple
[microservices](https://www.youtube.com/watch?v=y8OnoxKotPQ) that each solve a
specific part of the problem. You might have one service to store data, one
service to handle user requests, one service to handle sending two factor
emails, and so on. Among other things, this helps with scalability, and gives
you the ability to upgrade each part independently.

This can start getting complicated, when you realize that now you have multiple
services that you want to deploy every time you want to create a new
application.

The [Operator Framework](https://operatorframework.io/) is the tool for managing
this in Kubernetes. It allows you to define a "custom resource" that represents
your application. The Operator will not only spin up all the necessary services
for each instance of your custom resource that you create, but can also handle
things like running complicated upgrades and handling recovery when services go
down.

# Step One: Local Kubernetes Setup

The first thing I need is a local Kubernetes cluster. For this, I'll use
[Kind](https://kind.sigs.k8s.io/), which stands for "Kubernetes in Docker". It's
a tool for quickly running a Kubernetes cluster locally for testing.

I would recommend following the [kind quick
start](https://kind.sigs.k8s.io/docs/user/quick-start/). That covers how to
install kind and run your first cluster. As part of that setup, you'll also
install [kubectl](https://kubernetes.io/docs/tasks/tools/), the client that you
need to connect to your cluster.

In order to deploy Docker containers on a Kubernetes cluster, you need a [Docker
Registry](https://docs.docker.com/registry/) that your cluster can pull
containers from.

Since I wanted to run everything locally, I followed [this guide for running a local registry and set up kind to use it](https://kind.sigs.k8s.io/docs/user/local-registry/).

Once you have everything set up, and have run your first kind cluster, you
should be able to run this command and see everything running inside the
cluster.

```shell
kubectl get all --all-namespaces
```

# Step Two: Operator SDK Setup

For installation, I just followed the [installation guide
here](https://sdk.operatorframework.io/docs/installation/) to install the
operator-sdk, exactly as they say on that page.

Then I went to the [Quickstart for Go-based
Operators](https://sdk.operatorframework.io/docs/building-operators/golang/quickstart/)
guide. I followed the [OLM deployment
steps](https://sdk.operatorframework.io/docs/building-operators/golang/quickstart/#olm-deployment)
without any changes. The OLM, or "Operator Lifecycle Manager" is a tool to
deploy the operators themselves. [Who operates the
operator?](https://en.wikipedia.org/wiki/Quis_custodiet_ipsos_custodes%3F).

The place I had to make some changes was in the registry setup. That guide uses
"example.com" as a placeholder for the docker registry, but I want it to use the
local docker registry. Here is the change. go from this:

```
make docker-build docker-push IMG="example.com/memcached-operator:v0.0.1"
```

To this:

```
make docker-build docker-push IMG="localhost:5001/memcached-operator:v0.0.1"
```

The local registry for kind setup that is linked to above runs the registry on
port `5001` on the local machine, so `localhost:5001` is the way to tell this
build step to use our local registry.

In every other step on that page, replace `example.com/memcached-operator` with
`localhost:5001/memcached-operator`, and everything should work. However, for
the step where you run `operator-sdk run bundle`, you'll need to pass
`--use-http` since our local registry isn't configured with https.

```
operator-sdk run bundle localhost:5001/memcached-operator-bundle:v0.0.1 --use-http
```

# End Result

When all this is done, I get something like this when I look for running pods:

```
 $ kubectl get pods
NAME                                                              READY   STATUS      RESTARTS      AGE
8291880c9a17945544ca24d8f4429bb9fb5acf5b5c6d2175dee72a0374j27n5   0/1     Completed   0             154m
hello-server-8b9bd8fcb-x9w6v                                      1/1     Running     1 (44m ago)   4h2m
localhost-5001-memcached-operator-bundle-v0-0-1                   1/1     Running     1 (44m ago)   154m
memcached-operator-controller-manager-8b6b7f9fd-82f29             2/2     Running     2 (44m ago)   153m
```

I can also see the custom resources that our operator will look for:

```
 $ kubectl get crds memcacheds.cache.example.com
NAME                           CREATED AT
memcacheds.cache.example.com   2022-11-22T18:44:37Z
 $ kubectl get memcacheds
NAME               AGE
memcached-sample   149m
```

I don't see it deploying any services in response to this custom resource
existing, but I assume that's coming in the [full operator sdk
tutorial](https://sdk.operatorframework.io/docs/building-operators/golang/tutorial/).
This was just setting up the skeleton, but we haven't actually made our operator
do anything when a new `memcacheds.cache.example.com` resource is created.
