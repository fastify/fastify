/*
MIT License

Copyright (c) Matteo Collina and Undici contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

// Called from .github/workflows

const generateReleaseNotes = async ({ github, owner, repo, versionTag, defaultBranch }) => {
  const { data: releases } = await github.rest.repos.listReleases({
    owner,
    repo
  })

  const previousRelease = releases.find((r) => r.tag_name.startsWith('v4'))

  const { data: { body } } = await github.rest.repos.generateReleaseNotes({
    owner,
    repo,
    tag_name: versionTag,
    target_commitish: defaultBranch,
    previous_tag_name: previousRelease?.tag_name
  })

  const bodyWithoutReleasePr = body.split('\n')
    .filter((line) => !line.includes('[Release] v'))
    .join('\n')

  return bodyWithoutReleasePr
}

const generatePr = async ({ github, context, defaultBranch, versionTag }) => {
  const { owner, repo } = context.repo
  const releaseNotes = await generateReleaseNotes({ github, owner, repo, versionTag, defaultBranch })

  await github.rest.pulls.create({
    owner,
    repo,
    head: `release/${versionTag}`,
    base: defaultBranch,
    title: `[Release] ${versionTag}`,
    body: releaseNotes
  })
}

const release = async ({ github, context, defaultBranch, versionTag }) => {
  const { owner, repo } = context.repo
  const releaseNotes = await generateReleaseNotes({ github, owner, repo, versionTag, defaultBranch })

  await github.rest.repos.createRelease({
    owner,
    repo,
    tag_name: versionTag,
    target_commitish: defaultBranch,
    name: versionTag,
    body: releaseNotes,
    draft: false,
    prerelease: false,
    generate_release_notes: false
  })

  try {
    await github.rest.git.deleteRef({
      owner,
      repo,
      ref: `heads/release/${versionTag}`
    })
  } catch (err) {
    console.log("Couldn't delete release PR ref")
    console.log(err)
  }
}

module.exports = {
  generatePr,
  release
}
