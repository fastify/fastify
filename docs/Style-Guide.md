# Fastify Style Guide


## Welcome

Welcome to *Fastify Style Guide*. This guide is here to provide you with a conventional writing style for users writing developer documentation for our Open Source framework. Each topic is precise and well explained to help you write documentation users can easily understand and implement.


## Who is this guide for?

This guide is for anyone who loves to build with Fastify or want to contribute to our documentation. You don't need to be an expert in writing technical documentation. Our guideline is here to help you.
<br>

Visit the [contribute](https://www.fastify.io/contribute) page on our website or read the [CONTRIBUTE.MD](https://github.com/fastify/fastify/blob/master/CONTRIBUTING.md) on Github to join our Open Source folks.


## Before you write

You need to know the following:

* JavaScript
* Node.js
* Git
* Github
* Markdown
* HTTP
* NPM 


### Consider your Audience


Before you start writing, think about who your audience. In this case, your audience should know the following HTTP, HTML, CSS, JavaScript, NPM, NodeJs. It's necessary to put them in mind because they are the one consuming your content. You want to give as much useful information as possible. Consider the vital things they need to know and how they can get them, make references and use words readers can relate with easily. As for feedback from the community, it can help you write better documentation that focuses on the user and what you want to achieve.


### Get straight to the point


Give your readers a clear and precise action to take. Start with what is most important for your readers. This way, you can help them find what they need faster. Mostly, readers tend to read the first content on a page, and many will not scroll further.

**Example**

Less like this: Colons are very important to register a parametric path. It lets the framework know a there is a new parameter created. You can place the colon before the parameter name for the parametric path can be created.

More Like this: To register a parametric path, put a colon before the parameter name. Using colon lets the framework know it is a parametric path and not a wild card.



<!-- <br> -->

### Avoid adding video or image content 

<!-- <br> -->

Do not add videos or screenshots. Instead, make a referral link or a youtube video. You can add links by using `[Title](www.websitename.com)` in the markdown.

**Example**

```
To learn more about hooks, See [Fastify hooks](https://www.fastify.io/docs/latest/Hooks).
```

Result:
>To learn more about hooks, See [Fastify hooks](https://www.fastify.io/docs/latest/Hooks/).



### Avoid plagiarism

Make sure you evade copying other people's work, keep it as original as possible. You can learn from what they've done and also reference where it is if you used a particular quote from their work.


## Word Choice

<!-- content here -->

There are a few things you need to use and avoid when writing your documentation which will improve readability for readers and also make documentations neat, direct and clean all through your writing process.


### Use the second person ("you")  as the pronoun

When writing articles or step-by-step guides, your content should communicate directly to readers who is the second person ("you") addressed. It is easier to give them direct instruction on what to do when a particular topic. To see an example, visit the [Plugins-guide.md](https://github.com/fastify/fastify/blob/df9fbc183fa05fa1a23781b3f11fbf81f6854033/docs/Plugins-Guide.md) page on Github. 

> According to [Wikipedia](#), ***You*** is usually a second person pronoun. Also, used to refer to an indeterminate person, as a more common alternative to a very formal indefinite pronoun.


**Avoiding second person pronoun**
One of the main rules of formal writing such as references, synthesis and also in API documentation is to avoid second person ("you"). It should not directly address the user even when the word "you" is almost unavoidable when writing, but there are ways to avoid second person. Below are some alternative examples you can use to evade them. 

**Example**

Less Like this: You can use the following recommendation as an example.

More like this: As an example, The following are recommendations to use.

To view a documented example, visit the [Decorators.md](https://github.com/fastify/fastify/blob/df9fbc183fa05fa1a23781b3f11fbf81f6854033/docs/Decorators.md) page on Github. 

<!-- content here -->

Using the word "you" makes the reader know you are speaking to them. It is easier to give them direct instruction on what to do when a particular topic.



## Avoid writing condescending languages.

Condescending languages are words that include:

* Just 
* Easy
* Simply
* Basically
* Obviously

The reader may not find it easy to use the Fastify's framework and plugins, so avoid words that make it sound like they are simple or easy. Not everyone who reads the documentation has the same level of understanding.


### Starting with a verb


<!-- content here -->

Mostly start your description with a verb, which makes it simple and precise for the reader to follow. Use present tense in more often as it is easier to read and understand than the past or future tense.

**Example**

- [ ] Less like this: There is a need for Nodejs to be installed before you can be able to use fastify.

- [x] More like this: Install Nodejs to make use of fastify.

### Grammatical moods 

<!-- content here -->

Grammatical moods is a great way to express your writing, don't want to sound too bossy while making a direct statement. Know when to switch between indicative, imperative, and Subjunctive moods.


**Indicative** - Use when making a factual statement or question. 

Example: Since there is no testing framework available, "fastify recommend ways to write your test".


**Imperative** - Use when giving instructions, actions, commands, or when you write your headings.

Example: Install dependencies before you start application development mode.


**Subjunctive** -  Use when making suggestions, hypothesis or non-factual statement.

Example: Reading the documentation on our website is recommended to get comprehensive knowledge on the framework plugin.

### Use **active** voice instead of **passive**

Using active voice is a more compact and direct way of conveying your documentation.

**Example**

Passive: The dependencies of the npm package is installed by nodeJs.

Active: NodeJs installed the npm package dependencies.

