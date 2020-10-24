# Fastify Style Guide

## Welcome

Welcome to *Fastify Style Guide*. This guide is here to provide you with a conventional writing style for users writing developer documentation on our Open Source framework. Each topic is precise and well explained to help you write documentation users can easily understand and implement.

## Who is this guide for?

This guide is for anyone who loves to build with Fastify or wants to contribute to our documentation. You don't need to be an expert in writing technical documentation. This guide is here to help you.

Visit the [contribute](https://www.fastify.io/contribute) page on our website or read the [CONTRIBUTE.md](https://github.com/fastify/fastify/blob/master/CONTRIBUTING.md) file on Github to join our Open Source folks.

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

Before you start writing, think about your audience. In this case, your audience should already know HTTP, JavaScript, NPM and NodeJs. It's necessary to keep your readers in mind because they are the one consuming your content. You want to give as much useful information as possible. Consider the vital things they need to know and how they can understand them. Make references and use words readers can relate with easily. Ask for feedback from the community: it can help you write better documentation that focuses on the user and what you want to achieve.

### Get straight to the point

Give your readers a clear and precise action to take. Start with what is most important. This way, you can help them find what they need faster. Mostly, readers tend to read the first content on a page, and many will not scroll further.

**Example**

Less like this: Colons are very important to register a parametric path. It lets the framework know there is a new parameter created. You can place the colon before the parameter name so the parametric path can be created.

More Like this: To register a parametric path, put a colon before the parameter name. Using a colon lets the framework know it is a parametric path and not a static path.

### Avoid adding video or image content 


Do not add videos or screenshots in the documentation. It is easier to keep under version control. Videos and images will eventually end up becoming outdated as new updates keep developing. Instead, make a referral link or a youtube video. You can add links by using `[Title](www.websitename.com)` in the markdown.

**Example**

```
To learn more about hooks, See [Fastify hooks](https://www.fastify.io/docs/latest/Hooks).
```

Result:
>To learn more about hooks, See [Fastify hooks](https://www.fastify.io/docs/latest/Hooks/).



### Avoid plagiarism

Make sure you evade copying other people's work, keep it as original as possible. You can learn from what they've done and also reference where it's from if you used a particular quote from their work.


## Word Choice


There are a few things you need to use and avoid when writing your documentation which will improve readability for readers and also make documentations neat, direct and clean all through your writing process.


### When to use the second person "you" as the pronoun

When writing articles or step-by-step guides, your content should communicate directly to readers who is the second person ("you") addressed. It is easier to give them direct instruction on what to do on a particular topic. To see an example, visit the [Plugins-guide.md](https://github.com/fastify/fastify/blob/df9fbc183fa05fa1a23781b3f11fbf81f6854033/docs/Plugins-Guide.md) page on Github. 

**Example**

Less Like this: we can use the following plugins.

More like this: You can use the following plugins.

> According to [Wikipedia](#), ***You*** is usually a second person pronoun. Also, used to refer to an indeterminate person, as a more common alternative to a very formal indefinite pronoun.

## When to avoid second person "you" as the pronoun

One of the main rules of formal writing such as references, synthesis and also in API documentation is to avoid second person ("you"). It should not directly address the user even when the word "you" is almost unavoidable when writing, but there are ways to avoid second person. Below are some alternative examples you can use to evade them. 

**Example**

Less Like this: You can use the following recommendation as an example.

More like this: As an example, The following are recommendations to use.

To view a documented example, visit the [Decorators.md](https://github.com/fastify/fastify/blob/df9fbc183fa05fa1a23781b3f11fbf81f6854033/docs/Decorators.md) page on Github. 


### Avoid writing condescending languages.

Condescending languages are words that include:

* Just 
* Easy
* Simply
* Basically
* Obviously

The reader may not find it easy to use the Fastify's framework and plugins, so avoid words that make it sound simple or easy. Not everyone who reads the documentation has the same level of understanding.


### Starting with a verb

Mostly start your description with a verb, which makes it simple and precise for the reader to follow. Use present tense more often, it's easier to read and understand than the past or future tense.

**Example**

 Less like this: There is a need for Nodejs to be installed before you can be able to use fastify.

 More like this: Install Nodejs to make use of fastify.

### Grammatical moods 

Grammatical moods is a great way to express your writing, don't want to sound too bossy while making a direct statement. Know when to switch between indicative, imperative, and Subjunctive moods.


**Indicative** - Use when making a factual statement or question. 

Example: Since there is no testing framework available, "fastify recommend ways to write tests".

**Imperative** - Use when giving instructions, actions, commands, or when you write your headings.

Example: Install dependencies before starting application development mode.


**Subjunctive** -  Use when making suggestions, hypothesis or non-factual statement.

Example: Reading the documentation on our website is recommended to get comprehensive knowledge of the framework.

### Use **active** voice instead of **passive**

Using active voice is a more compact and direct way of conveying your documentation.

**Example**

Passive: The dependencies of the npm package is installed by nodeJs.

Active: NodeJs installs the npm package dependencies.

## Writing Style

### Documentation titles

When creating a new guide, API or reference in the `/docs/` directory, use short titles that best describe the topic of your documentation. 
Separate each sentence with the dash *(-)* symbol, which makes your `.md` files clear and readable. It also increases the chance of showing up on search engines (Google, DuckDuckg or Bing) in spheres of Search Engine Optimisation.

**Examples**: <br>
>`hook-and-plugins.md`, <br> 
 `adding-test-plugins.md`, <br>
 `removing-requests.md`.

### Hyperlinks

Hyperlinks should have a clear title of what it references.
Here is how your hyperlink should look: 

```MD
<!-- More like this -->

// Add clear & breif description
[Fastify Plugins] (https://www.fastify.io/docs/latest/Plugins/)

<!--Less like this -->

// incomplete description 
[Fastify] (https://www.fastify.io/docs/latest/Plugins/)

// Adding title in link brackets
[](https://www.fastify.io/docs/latest/Plugins/ "fastify plugin")

// Empty title
[](https://www.fastify.io/docs/latest/Plugins/)

// Adding links localhost URL's instead of using code strings (``)
[http://localhost:3000/](http://localhost:3000/)

```
You can include in your documentation as many essential references as possible, but avoid having numerous links when writing for beginners to avoid distractions.
