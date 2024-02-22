This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Before you start

This reposoitory has a dependency from [i18n/countries](https://gitlab.starofservice.com/i18n/countries) repository in GitLab. It is used as a git submodule. Make sure you have access to it and SSH key is configured properly.

## Project Setup

### Source code
Clone the repository with submodules. **Make sure that you're using same SSH key for the both Github and Gitlab.**

```bash
git clone git@github.com:StarOfService/aurora2.git --recurse-submodules
```

During development when you need to pull new changes for submodules, run:
```
git submodule update --remote
```
---
### Environment Variables
We store environment variables in Vercel. To pull them for local development one needs to login to Vercel using Vercel cli and link to the existing project. Make sure to have Vercel account setup.

#### 1. Download Vercel CLI

```
yarn global add vercel
```
#### 2. Login to your Vercel account

The command is interactive. Make sure to choose the login option you prefer/ used when creating your Vercel account

```
vercel login
```
#### 3. Link your local project to the existing vercel project.

It should generate a .gitignored `.vercel` directory that contains vercel project id and key. The command is in interactive mode, make sure to select the correct scope (starofservice) and link it to the existing project (aurora2).

_Note:_ Make sure to run this command from the project root

```
vercel link
```
#### 4. Pull environment variables.

 This command will create/overwrite (if exists) a .gitignored `.env` file with all the necessary env variables in it. During development when you need to pull new env variables you can safely ignore steps 1-3.

If you want to have your custom env variables for local development feel free to maintain `.env.local` .gitignored file which has higher priority.

_Note:_ Make sure to run this command from the project root

```
vercel env pull
```
#### 5. Export global env variable for MOBISCROLL_TOKEN.
- Edit your `~/.bashrc` or `~/.zshrc` or any other equivalent file and add the following line
```
export MOBISCROLL_TOKEN=mobiscroll_token
```
NOTE: You can get its value from .env file pulled from Vercel


---
### Project setup

_Note:_ The project is setup using `yarn` package manager.

To install the dependencies and husky hooks run:

```bash
yarn install
```

. To start the development server
```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

