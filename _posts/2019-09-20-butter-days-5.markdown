---
layout: post
title:  "Butter Days: Day 5"
date:   2019-09-20 01:00:00 -0500
categories: butter open-source
---
This is Day 5 of [Butter Days]({% post_url 2019-09-13-butter-days-4 %}), from
Red Rock Coffeehouse in Boulder, CO.

Last time I generated a Rust OpenAPI client that uses
[reqwest](https://github.com/OpenAPITools/openapi-generator/tree/master/samples/client/petstore/rust-reqwest)
and used it to query the public pestore (found a
[bug](https://github.com/OpenAPITools/openapi-generator/issues/3885) in the
process).

This time I'm going to write the code to generate the nonstandard [AWS
Signature](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)
required to authenticate with the Amazon API in Rust, and try to send a single
request to the API with a Rust client.

I'm going to heavily reference the [awscurl](https://github.com/okigan/awscurl)
project, because I know that works.

See [Day 1 of Butter Days]({% post_url 2019-08-23-butter-days-1 %}) for context
on what I'm ultimately trying to build.

<hr>
<br>

## How To Sign

I'm starting by reading through the awscurl code, because it's a very simple
project that pretty much only does exactly what I'm looking for.  After a few
minutes, I can see that [this
code](https://github.com/okigan/awscurl/blob/master/awscurl/awscurl.py#L213) is
where the final request headers get added:

```python
headers.update({
    'Authorization': authorization_header,
    'x-amz-date': amzdate,
    'x-amz-security-token': security_token,
    'x-amz-content-sha256': payload_hash
})
```

Searching for `x-amz-content-sha256`, I find [these AWS
docs](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html)
which look helpful.

Well, now I understand why that python code looks so complicated.  You have to
calculate a hash of your request, but in a very specific convoluted way so it
matches the way AWS hashes it.  This looks like something that was designed by
more than one person.

I'm not that interested in learning all the details about how this signature
process works, so let's try another approach.

## Porting Awscurl

Because some super awesome open source person has already done the work to
produce this (and it works!), I'm going to try to benefit from that.

I'm going to do this by breaking the code there into stages, and printing all
the variables at each stage.  Then I can start writing the rust version and just
bang on it until it matches.

Let's try to be a good open source neighbor and also clean up the python code in
the process.  If I'm breaking down the stages the least I could do is add some
unit tests for them.

## Running the Awscurl Tests

First, lets clone the project and install the dependencies:

```
$ git clone git@github.com:okigan/awscurl.git
Cloning into 'awscurl'...
remote: Enumerating objects: 476, done.
remote: Total 476 (delta 0), reused 0 (delta 0), pack-reused 476
Receiving objects: 100% (476/476), 82.30 KiB | 523.00 KiB/s, done.
Resolving deltas: 100% (274/274), done.
$ cd awscurl/
$ virtualenv env
New python executable in /home/sverch/projects/awscurl/env/bin/python2
Also creating executable in /home/sverch/projects/awscurl/env/bin/python
Installing setuptools, pip, wheel...done.
$ . env/bin/activate
(env) $ pip install -r requirements.txt
...
(env) $ pip install -r requirements-test.txt
...
```

Note that I'm using [virtualenv](https://virtualenv.pypa.io/en/latest/) to
create an isolated python installation so that I don't muddy my system packages.
I'm using that instead of one of the other [python virtual
environment](https://towardsdatascience.com/comparing-python-virtual-environment-tools-9a6543643a44)
tools because it's one that I know is supported as an official Python tool and
works with Python 2.7.  Since this project just has a `requirements.txt` file
and nothing else I'm going to assume the most generic workflow.

Now, let's see if everything passes:

```
$ pytest
========================================== test session starts ==========================================
platform linux2 -- Python 2.7.15, pytest-4.6.5, py-1.8.0, pluggy-0.13.0
rootdir: /home/sverch/projects/awscurl
collected 12 items                                                                                      

tests/basic_test.py .                                                                             [  8%]
tests/integration_test.py ..                                                                      [ 25%]
tests/load_aws_config_test.py .                                                                   [ 33%]
tests/unit_test.py .......                                                                        [ 91%]
tests/url_parsing_test.py .                                                                       [100%]

======================================= 12 passed in 0.89 seconds =======================================
```

Great!  Quality project right here.

## Splitting It Up

From the [AWS docs I found earlier, it looks like there are three
sections](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html),
so let's split the awscurl code into three separate functions.  Because there
are already unit tests, we can quickly check if we broke anything.

Fortunately, the code is very well separated already with great comments, so I
can actually shut off my brain for this part and just turn the comments into
functions.

For example, this:

```python
# ************* TASK 2: CREATE THE STRING TO SIGN*************
# Match the algorithm to the hashing algorithm you use, either SHA-1 or
# SHA-256 (recommended)
(code)
```

Becomes:

```python
def task_2_create_the_string_to_sign(): # TODO: arguments
    """
    ************* TASK 2: CREATE THE STRING TO SIGN*************
    Match the algorithm to the hashing algorithm you use, either SHA-1 or
    SHA-256 (recommended)
    """
    (code)
```

To figure out what arguments I need to pass, I can install pylint:

```
$ pip install pylint
```

That combined with [syntastic](https://github.com/vim-syntastic/syntastic) will
show me all the errors in vim, so after copy/pasting all the sections I can fix
all the undefined variable errors until the linter is happy.

Ultimately that function turned into:

```python
def task_2_create_the_string_to_sign(
        amzdate,
        datestamp,
        canonical_request,
        service,
        region):
    """
    ************* TASK 2: CREATE THE STRING TO SIGN*************
    Match the algorithm to the hashing algorithm you use, either SHA-1 or
    SHA-256 (recommended)
    """
    (code)
```

That took way longer than I expected.  After splitting it out, the main function
looks like this:

```python
canonical_request, payload_hash, signed_headers = task_1_create_a_canonical_request(
    query,
    headers,
    port,
    host,
    amzdate,
    method,
    data,
    security_token,
    data_binary,
    canonical_uri)
string_to_sign, algorithm, credential_scope = task_2_create_the_string_to_sign(
    amzdate,
    datestamp,
    canonical_request,
    service,
    region)
signature = task_3_calculate_the_signature(
    datestamp,
    string_to_sign,
    service,
    region,
    secret_key)
aws_auth_headers = task_4_add_signing_information_to_the_request(
    amzdate,
    payload_hash,
    algorithm,
    credential_scope,
    signed_headers,
    signature,
    headers,
    access_key,
    security_token)
headers.update(aws_auth_headers)
```

This is why I like doing stuff like this.  Splitting up the stages has revealed
the true complexity of this code.  It was always this complicated, but before
all that complexity was hidden, and we could live with the illusion of a "simple
four step process".

The linter is happy, now let's make sure `pytest` is still happy:

```
$ pytest
========================================== test session starts ==========================================
platform linux2 -- Python 2.7.15, pytest-4.6.5, py-1.8.0, pluggy-0.13.0
rootdir: /home/sverch/projects/awscurl
collected 12 items                                                                                      

tests/basic_test.py .                                                                             [  8%]
tests/integration_test.py ..                                                                      [ 25%]
tests/load_aws_config_test.py .                                                                   [ 33%]
tests/unit_test.py .......                                                                        [ 91%]
tests/url_parsing_test.py .                                                                       [100%]

======================================= 12 passed in 0.83 seconds =======================================
```

Great!

## Adding Tests

Now that we've split up the sections, we can add unit tests for each stage.

I'm lazy, so what I'm going to do is run it once for real and log everything,
and then hard code all those values in a unit test (obviously with fake secret
keys).

With some annoying vim macros and find replace, I get this:

```python
print("string_to_sign, algorithm, credential_scope = task_2_create_the_string_to_sign(")
print("amzdate=\"%s\"," % amzdate)
print("datestamp=\"%s\"," % datestamp)
print("canonical_request=\"%s\"," % canonical_request)
print("service=\"%s\"," % service)
print("region=\"%s\"," % region)
print(")")
string_to_sign, algorithm, credential_scope = task_2_create_the_string_to_sign(
    amzdate,
    datestamp,
    canonical_request,
    service,
    region)
print("self.assertEqual(string_to_sign, \"%s\")" % string_to_sign)
print("self.assertEqual(algorithm, \"%s\")" % algorithm)
print("self.assertEqual(credential_scope, \"%s\")" % credential_scope)
```

I want this to generate as much of the code as possible.

Running it, I get:

```
$ pip install .
$ awscurl --service ec2 'https://ec2.amazonaws.com?Action=DescribeInstances&Version=2013-10-15'
...
string_to_sign, algorithm, credential_scope = task_2_create_the_string_to_sign(
amzdate="20190921T021821Z",
datestamp="20190921",
canonical_request="GET
/
Action=DescribeInstances&Version=2013-10-15
host:ec2.amazonaws.com
x-amz-date:20190921T021821Z

host;x-amz-date
(redacted)",
service="ec2",
region="us-east-1",
)
self.assertEqual(string_to_sign, "AWS4-HMAC-SHA256
20190921T021821Z
20190921/us-east-1/ec2/aws4_request
(redacted)")
self.assertEqual(algorithm, "AWS4-HMAC-SHA256")
self.assertEqual(credential_scope, "20190921/us-east-1/ec2/aws4_request")
```

I removed anything that even seemed like it could possibly be a secret, but this
is good.  It gives me something to copy into a test.  Let's do that:

```
$ awscurl --service ec2 'https://ec2.amazonaws.com?Action=DescribeInstances&Version=2013-10-15' \
    >> tests/stages_test.py
```

After fixing a bunch of type issues and formatting errors, the tests now pass!

```
$ pytest
========================================== test session starts ==========================================
platform linux2 -- Python 2.7.15, pytest-4.6.5, py-1.8.0, pluggy-0.13.0
rootdir: /home/sverch/projects/awscurl
collected 16 items                                                                                      

tests/basic_test.py .                                                                             [  6%]
tests/integration_test.py ..                                                                      [ 18%]
tests/load_aws_config_test.py .                                                                   [ 25%]
tests/stages_test.py ....                                                                         [ 50%]
tests/unit_test.py .......                                                                        [ 93%]
tests/url_parsing_test.py .                                                                       [100%]

======================================= 16 passed in 1.35 seconds =======================================
```

Now I just need to modify anything that looks like a key and we're good.  These
functions are easy to test because they only have inputs and outputs and don't
make any network calls.

The only thing I needed to replace was the `secret_key` argument.  After that, I
updated some hashes and the tests all passed again!

## Submitting a Pull Request

The first thing I did was rebase all my commits, so that my secret key wasn't in
the history.  That's important.  Then I ran `git show` and moved things around
until the diff was nice.  I had moved some functions around in ways that had
nothing to do with what I was actually modifying, and it made it harder to see
what changed.  I assume this person isn't paid for this project.

Then I forked the repo and pushed a branch to my fork:

```
$ git remote add sverch-origin git@github.com:sverch/awscurl.git
$ git push sverch-origin split-signature-stages 
Counting objects: 7, done.
Delta compression using up to 8 threads.
Compressing objects: 100% (7/7), done.
Writing objects: 100% (7/7), 3.67 KiB | 3.67 MiB/s, done.
Total 7 (delta 3), reused 0 (delta 0)
remote: Resolving deltas: 100% (3/3), completed with 3 local objects.
remote: 
remote: Create a pull request for 'split-signature-stages' on GitHub by visiting:
remote:      https://github.com/sverch/awscurl/pull/new/split-signature-stages
remote: 
To github.com:sverch/awscurl.git
 * [new branch]      split-signature-stages -> split-signature-stages
```

After a quick review to check again that I'm not revealing anything secret,
[here's the pull request](https://github.com/okigan/awscurl/pull/69).

They even have continuous integration set up, but looks like [it
failed](https://travis-ci.org/okigan/awscurl/jobs/587740995).  I had to [make
something called `pycodestyle`
pass](https://github.com/okigan/awscurl/pull/69/commits/e79bc2798d686748cd86126fdfb24784953fb52a),
and now we're good.

## Next Time

That took way longer than I expected, but I think it will make it easier to
write the Rust version.

For that I should probably also heavily reference [this code from within the AWS
Rust
client](https://github.com/rusoto/rusoto/blob/master/rusoto/core/src/signature.rs).
I don't know how standalone it is, but now that I've done this once and have
some test cases it should be easier to figure it out.

Once I have this implemented in Rust, I can try to auto generate a rust openapi
client from the [AWS OpenAPI
specs](https://github.com/APIs-guru/openapi-directory/tree/master/APIs/amazonaws.com),
and start making real requests!

You might wonder why I don't just use the AWS Rust client instead of doing this.
Ultimately, I'm hoping that doing it this way will allow me to auto generate
more code based on the openapi specs, specifically code that can automatically
export everything it can from a given API.
