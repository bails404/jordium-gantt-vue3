# GitHub Pages Deployment Guide

The repository retains a GitHub Pages workflow triggered only by `workflow_dispatch`. Pushing does not deploy it automatically. This document describes repository configuration, not a claim that Pages is enabled or published for this Fork.

## Fork deployment constraints

- Custom code lives on `codex/resource-schedule`; upstream demo URLs do not contain these changes.
- `demo/main.ts` and navigation use root paths `/original` and `/resources`. A standard Pages project URL includes a repository prefix; path detection, links and direct-load fallback still need adaptation. Relative asset URLs alone do not solve this.
- The resource page requests `/api/resource-occupancies`. Vite's `server.proxy` is a development-server feature; static hosting does not provide that proxy or access to the developer's LAN service.
- Use the [local setup](../README.md) first. A production resource page needs an API proxy with access to the service, root-path hosting and appropriate SPA fallback. The inherited workflow is not a ready-to-use deployment solution for the resource page until these constraints are addressed.

## 🌐 Online visit

**Upstream Demo**: [Original author's GitHub Pages](https://nelson820125.github.io/jordium-gantt-vue3/). This is not a deployment of this Fork.

## 🔧 Deployment Configuration

### Existing deployment workflow

The checked-in GitHub Actions workflow is configured as follows:

- **Trigger**: `workflow_dispatch`; run manually from Actions and select a branch
- **Build Command**: `npm ci`, then `npm run build:demo`; no `build:pages` script exists
- **Build Environment**: Node.js 22 in the workflow
- **Deployment Directory**: `./dist`
- **Workflows**: `.github/workflows/deploy-github-pages.yml`

### Enable GitHub Pages manually

1. Enter the GitHub repository settings page
2. Find the "Pages" setting options
3. Select "Source" as "GitHub Actions"
4. After resolving the path/API constraints above, open `Deploy GitHub Pages` in Actions, choose the intended branch and run it manually

The workflow retains an upstream actor-permission condition that permits the repository owner. Updating this document does not change repository settings, modify the workflow or deploy anything.

## 📁 Construct the product

- **Development and Construction**: `npm run build` → `dist/`
- **Pages workflow build**: `npm run build:demo` → in-repository `dist/`; production `base` is `./`, which does not make page routing prefix-aware
- **Library build**: `npm run build:lib` → `npm-package/dist/` in the parent directory of the checkout; see [output/entry-point constraints](CUSTOMIZATION.md#reuse)

## 🛠️ Local Preview

```bash
# Installation dependencies
npm ci

# Start the development server
npm run dev

# Build and preview the production version
npm run build:demo
npm run preview
```

## 🔄 Update deployment

Each manual workflow run will:

1. Check out the code
2. Install Node.js and dependencies
3. Build demo application
4. Deploy to GitHub Pages

## 📝 Notes

- Deployment usually takes 1-5 minutes to take effect
- Make sure GitHub Pages is enabled in repository settings
- Custom domain names need to be configured in the `demo/public/CNAME` file
- A successful build does not establish resource-page availability; verify prefixed navigation, direct loads and API access
