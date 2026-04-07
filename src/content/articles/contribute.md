---
title: Contribute
---

## Create an article using the editor

The easiest way to create a new article is to use our built-in
[Article Editor](/new-article). It will:

1. Let you fill in the title, author, category, and content
2. Generate a properly formatted `.md` file with the correct frontmatter
3. Give you a link to create a Pull Request on GitHub directly

If your article is too large for the direct link, the editor will let you
download the `.md` file and provides step-by-step instructions for uploading it
manually.

**Note: You need a GitHub account to submit articles.**

### Article review

Someone will check if the article is not broken on the website and is not
missing information, you might be asked to make some changes before the page is
added to the website.

Once your tutorial is merged it is automatically released to the website.

## Writing tutorials

Tutorials can be written in Markdown markup language, with some extra features from GitHub Flavored Markdown supported. To get familiar with the syntax, you can visit [this page](https://commonmark.org/help/).

In addition, this website supports markdown extensions provided by [Docusaurus](https://v2.docusaurus.io/docs/markdown-features):

```lua title="named-code-example.lua" {2}
function foo() {
  -- Highlighted line
}
```

:::note
Admonitions
:::

### Embeds

**To add a Gfycat gif to the page use the following format:**

To embed https://gfycat.com/remarkableimportantant:

Use `<Gfycat id="remarkableimportantant" />`

**To add a YouTube player to the page use the following:**

To embed https://www.youtube.com/watch?v=GMvmdnNM6Sc:

Use `<YouTube id="GMvmdnNM6Sc" />`

### Headings

In Docusaurus, Markdown's [headings] get an additional meaning - they are used to generate Table of Contents, which you can see on the right side from the article.

:::info
Only headings of levels 2 (##) and 3 (###) would appear in the Table of Contents.
:::

:::caution
Do not use headings of the first level (#) in tutorials. It would be automatically added based on the `title` field.
:::

## Using a git fork

**Warning: Advanced users only**

This website is set up as a Github Pages project which is automatically rendered from its source contents by Jekyll. Content is rendered automatically after each push to master and published to the website.

You can simply fork or clone the repository to edit the files and submit a pull
request to the main repository.

File structure is as follows:

```
.
_articles/         # Directory storing all articles as markdown files
  | abilities/     # Ability/item/modifier tutorials
  | scripting/     # Lua scripting guides
  | panorama/      # Panorama UI tutorials
  | assets/        # Particles, models, maps, sounds
  | units/         # Unit creation guides
  | tools/         # Development tools and setup
  | index.md       # Homepage
  | ...
api/               # API reference site (React SPA)
src/               # Docusaurus pages and components
```
