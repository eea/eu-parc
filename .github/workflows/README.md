# GitHub Actions Workflows - Automated Sync

This repository uses automated workflow synchronization from our [central template repository](https://github.com/eaudeweb/drupal-workflows-template) to maintain consistent CI/CD practices across all projects.

It is based on https://github.com/AndreasAugustin/actions-template-sync for synchronization.

## How It Works

Workflows from this repository are automatically synchronized from the central template repository:
- **Sync Frequency**: Every Monday 5:00 AM UTC
- **Sync Method**: Automatic pull requests
- **Template Branch**: `main`

When the template repository is updated, a pull request will be automatically created in this repository with the latest workflow changes.

## Available Workflows

This template includes the following workflows:

- **tag-based PROD deployment** - deployments using tags
- **tag-based PROD deployment (multisite)** - deployments using tags
- **branch-based deployment** - automated deployment based on branch push
- **SQL Dump** - database backup workflows for test/prod
- **Database Sync** - database synchronization between environments
- **Cleanup Git Tags** - cleanup old Git tags and branches based on a specified date/count retention policy

## Project Configuration

### Workflow Synchronization Setup

To enable automatic workflow synchronization, you need to configure one secret:

| Secret Name           | Description                                 | How to obtain                |
|-----------------------|---------------------------------------------|------------------------------|
| `TEMPLATE_SYNC_TOKEN` | Personal Access Token for syncing workflows | Ask someone from DevOps Team |

### Workflow Configuration

The workflows in this repository are standardized and use the following **GitHub secrets** and **variables** for project-specific configuration.

#### Required Secrets

Configure these in **Settings** → **Secrets and variables** → **Actions** → **Secrets**:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `PROD_SSH_USER` | SSH username for deployments | web |
| `PROD_SSH_HOST` | Host for production deployments | IP |
| `PROD_SSH_HOST_APP2` | Host for production deployments (app2) - if necessary | IP |
| `PROD_SSH_KEY` | SSH private key for production deployments | (private key content) |
| `STATUSCAKE_API_KEY` | api key for connection to StatusCake |  |
| `PROD_STATUSCAKE_ID` | id of the production website in StatusCake |  |
| `DISCORD_WEBHOOK` | Discord webhook URL for notifications |  |
| `NEXTCLOUD_USER` | Nextcloud username (for database upload/download to Eaudeweb Drive) |  |
| `NEXTCLOUD_APP_PASSWORD` | Nextcloud app password (for database upload/download to Eaudeweb Drive) |  |

#### Required Variables

Configure these in **Settings** → **Secrets and variables** → **Actions** → **Variables**:

| Variable Name | Description | Example |
|----------------------------|--------------------------------------------------------------------------------------------------------|----------------------|
| `PROD_URL`                 | Production website URL                                                                                 | https://example.org  |
| `PROD_PHP_VERSION`         | PHP version to be used on the production server                                                        | `8.3` |
| `PROD_PROJECT_DIR`         | Disk path to the website symlink on the production server                                              | `/var/www/html/example.org` |
| `PROD_ARTIFACTS_DIR`       | Disk path to the artifacts directory (where actual release artifacts) on the production server         | /var/www/artifacts/example.org |
| `PROD_SETTINGS_FILE `      | Disk path to the `settings.local.php` on the production server                                         | `/var/www/config/example.org/settings.local.php` |
| `PROD_PUBLIC_FILES_DIR`    | Disk path to ther public files directory on the production server                                      | `/var/www/config/example.org/files` |
| `PROD_ROBO_FILE`           | (Optional) Disk path to the `robo.yml` file on the production server                                   | `/var/www/config/example.org/robo.yml` |
| `PROD_LOCAL_SERVICES_FILE` | (Optional) Disk path to the local services file on the production server                               | `/var/www/config/example.org/services.local.yml` |
| `RETAIN_RELEASES`          | (Optional) Number of releases to retain on the production server                                       | 5 |
| `RUNNER_LABEL`             | (Optional) Label of the runner to be used for deployment                                               | `drupal-runner-v2` |
| `ENABLE_NODEJS`            | (Optional) Flag to enable Node.js setup during workflow execution. When `true`, `actions/setup-node` is executed. |  `true`/`false` |
| `NODE_VERSION_FILE`        | (Optional) Disk path to the Node.js version (e.g. `.nvmrc`, `.node-version`)                                      | `.nvmrc` |
| `COMPILE_THEME_SCRIPT`     | (Optional) Disk path to the theme compilation script executed during the deployments - [see](https://github.com/eaudeweb/iucn.org/blob/main/.github/workflows/deploy-dev.yml#L31). If empty, the compile step is skipped. | `scripts/compile-theme.sh` |

> **Important**: Same variables and secrets are needed for the test environment workflows, prefixed with `TEST_` instead of `PROD_`.

> **Note**: Each job supports the `RUNNER_LABEL` variable (`${{ vars.RUNNER_LABEL }}`) to override the default runner. If not set, the default runner label `drupal-runner-v2` is used.

## Customizing Workflow Synchronization

Some workflows are optional, if your don't have a test environment, don't create the test* deployment workflows. Create a `.template-sync-ignore` file in `.github/workflows/` to exclude specific workflows from being synced, for instance:

```bash
# Ignore test-related workflows (if no test environment exists)
.github/workflows/*test*.yml
.github/workflows/deploy-test.yml
# Ignore SQL dump and database sync workflows (if not needed)
.github/workflows/sql-dump.yml
.github/workflows/database-sync.yml
# Ignore multisite production deployment workflow (if not needed)
.github/workflows/deploy-prod-multisite.yml
```

## Handling updates

When workflows are updated in the template repository, a pull request is opened automatically with the changes, labeled with `template-sync`, `automated` and specific message.

> **Important**
>
> - Existing workflow files will **not** be deleted through the template sync pull request.
> - If a workflow file exists in your repository but its filename does not match any workflow file from the template, it will be ignored and will not be modified.

## Manually

If you need to sync workflows immediately (without waiting for the daily schedule), follow these steps to create the pull-request:

1. Go to **Actions** tab
2. Select **"Sync workflows from template"** workflow
3. Click **"Run workflow"** button
