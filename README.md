# Pairadise Env

_Pairadise Env_ is a combination of a _CLI Tool_ and a _Service Backend_ connected an _IDP_ and _Git Repositories_ to
set up local development machine environments based on content managed with a _Password Manager_.

The _CLI Tool_ sets up the local shell and system environment of a developer machine based on the content of _Password
Manager_ files received from the _Service Backend_. 

## State of Development
_This readme is the backlog of this project. Some parts already work as advertised, others are pure stories about how it
should work. Please join if you'd like to see this thing live!_

## Usage

1. the user invokes the _CLI Tool_
1. the _CLI Tool_ establishes a session with the _Service Backend_
1. the _CLI Tool_ opens a browser to a landing page associated to the session with the _Service Backend_
1. the user authenticates with the _Service Backend_
1. the _Service Backend_ sends the user's keystore file to the _CLI Tool_
1. the user unlocks the keystore within the _CLI Tool_
1. the _CLI Tool_ scans the keystore for
    - declared environment variables and stores them in ~/.para-env 
    - declared files and stores them relative to ~/

## Keystore format

The _CLI Tool_ sets environment variables and creates files based on the contents of the _Password Manager_ file.

Entries in the _Password Manager_ file need specific attributes to get picked up:

- If an attributes has a key called "ENV" then the value is evaluated as gotpl with the values for {{ .Username }} and
{{ .Password }} taken from the _Password Manager_ file entry with the result being written into the ~/.para-env file.
- If an attribute has a key starting with "ENV:" then the value is also evaluated as gotpl and assigned to an 
environment variable as declared in the attribute key after the ":" .
- If an attribute has a key starting with "FILE:" then the file attachment of _Password Manager_ entry with a filename
as specified in the attribute value is stored in a local file relative to ~/ as declared in the attribute key after the
":" . 

## Setup

Put the following lines into your `~/.profile` file:
```
touch ~/.para-env
source ~/.para-env
```

This causes the environment variables set through _Pairadise Env_ to be defined every time you open a new terminal.

## User Tale

The session is initiated by invoking the _CLI Tool_:

```bash
dev-station ~ # para-env
```

The _CLI Tool_ establishes a connection with the _Service Backend_ and opens a browser prompting both developers to
login using their preferred IDPs. A user may opt for the 'odd' seat and skip the login of a pairing partner _(1)_.

The landing page offers to create a new account. During the registration process the user is required to log in using 
a supported IDP and needs to provide a private git repository with access credentials.

Two logged-in users are able to create a _Project_ using the _CLI Tool_, which in turn requires an additional _Git 
Repository_ with credentials for an additional _Password Manager_ file. The credentials and location of the _Git 
Repository_ associated with this project are stored in the _Password Manager_ files of the respective users as well
as in the _Service Backend_, making them the first _Project Members_:

```bash
dev-station ~ # para-env create-project
 
 Project Setup:
 - Name: Product One
 - Git Location: https://git.corp.com/projects/product-one/tech-user.git
 - Credentials: ***************************
 
 Found empty Git repository
 Created empty Password Manager file with random password
 Unlock your Keystores:
 - Driver: ****************
   Keystore unlocked
   Updated Driver Password Manager file
 
 - Navigator: ****************
   Keystore unlocked
   Updated Navigator Password Manager file
 
 Created Project:
 - Slab: product-one
 
 To switch to the new project run:
 
 para-env set-project product-one
 
dev-station ~ # 
```

A _Project Member_ is able to invite other users to the project. The _CLI Tool_ adds the required credentials to the 
new user's _Password Manager_ file after accepting the invitation in the _CLI Tool_:

```bash
dev-station ~ # para-env invite-user
 
 Opening browser at:
 
  https://para-env.cloud.corop.com/session?token=D87AD72D-86B5-4262-9DB6-E42B225EB98B
 
 Login complete:
 - Project: Product One
 - Member: Kim Hackster <kim.hackster@corp.com>
 - Invited: Earnest Eager <earnest.eager@corp.com>
 
 Project Setup:
 - Name: Product One
 - Git Location: https://git.corp.com/project/tech-user.git
 - Credentials: accesstoken-or-user:password-pair
 
 Unlock your Keystores:
 - Member: ****************
   Keystore unlocked
 
 - Invited: ****************
   Keystore unlocked
   Updated Invited Password Manager file
 
 Invitation succesful
 
 Dear Earnest, 
 Welcome To The Club!
  
dev-station ~ # 

```

Upon successful login, the _Service Backend_ loads the associated _Password Manager_ files of both users from their 
respective _Git Repositories_ and prompts for the individual access codes at the command prompt:

```bash
dev-station ~ # para-env
 
 Opening browser at:
 
  https://para-env.cloud.corop.com/session?token=D87AD72D-86B5-4262-9DB6-E42B225EB98B
 
 Login complete:
 - Project: Product One
 - Driver: Kim Hackster <kim.hackster@corp.com>
 - Navigator: Taylor Typington <taylor.typington@corp.com>
 
 Unlock Your Keystores:
 - Driver: ****************
   Keystore unlocked
 
 - Navigator: 
   Keystore unlocked
 
 Environment is ready.
 
 To switch driver and navigator run:
 
 para-env change-places

```

The tool will have set the environment variables of eg. Maven Repository credentials, HTTP Proxy location and 
credentials, SSH-keys to access git repositories and cloud jump hosts, etc based on the sum of the content of the
_Password Manager_ files.

## Password Manager file content

The _CLI Tool_ uses pattern matching to identify entries of the _Password Manager_ file as either environment variables
or files relative to the local user home directory.

## Service Backend

The _Service Backend_ contains of a public _service_, a _database_ and one or more configured _IDPs_. The _service_
is invoked by the _CLI Tool_ to retrieve the _Password Manager_ file and _Project_ membership. The user ID provided
by the _IDP_ is associated with the location and credentials of the user provided _Git Repository_ and persisted in 
the _database_ as well as individual users' _Project_ memberships.

The _Service Backend_ does **not** store or process credentials required to open the actual _Password Manager_ files 
of users and projects. This is only done offline by the _CLI Tool_.

## Acceptance Criteria

- heavy use of UTF-8 and escape codes for colors, emojis, etc in the terminal output of the CLI tool
- sick minimalistic web interface for the browser stuff
- encrypted storage of database content using secret shared between backend service instances
- helm chart or cloud foundry manifest
- Concourse CI
- tests for the CLI
- tests for the backend too
- integration tests for the shell-fu magic
- Github as IDP
- Some custom login as IDP
