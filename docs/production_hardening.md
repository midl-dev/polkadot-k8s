# Production hardening

Follow these instructions for production hardening of the deployment.

## Terraform service account

Usage of [Google Default Application Credentials](https://cloud.google.com/docs/authentication/production) is not recommended in a production environment.

Instead:

* ensure that you have set up an Organization - that can be done by registering a domain name and adding it to gcloud
* create a Terraform Admin Project, Terraform Service Account and Service Account Credentials following [this Google guide](https://cloud.google.com/community/tutorials/managing-gcp-projects-with-terraform)
* do not pass `project` as a variable when deploying the resources. Instead, pass `organization_id` and `billing_account` as variables
* pass the service account credentials json file `serviceAccount:terraform@${TF_ADMIN}.iam.gserviceaccount.com` as `credentials` terraform variable

That will create the cluster in a new project, created by the terraform service account.

You may then grant people in your organization access to the project. It is recommended to write more terraform manifests to do so.
