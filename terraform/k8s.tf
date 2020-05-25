data "google_project" "blockchain_project" {
  count      = var.kubernetes_config_context != "" ? 0 : 1
  project_id = var.project
}

# Obtain the project_id from either the newly created project resource or
# existing data project resource One will be populated and the other will be
# null
locals {
  blockchain_project_id = element( concat(
      data.google_project.blockchain_project.*.project_id,
      [var.project]
    ),
    0,
  )
}

resource "kubernetes_secret" "polkadot_node_keys" {
  metadata {
    name = "polkadot-node-keys"
  }
  data = var.polkadot_node_keys
}

resource "kubernetes_secret" "polkadot_node_ids" {
  metadata {
    name = "polkadot-node-ids"
  }
  data = var.polkadot_node_ids
}

resource "kubernetes_secret" "polkadot_panic_alerter_config_vol" {
  metadata {
    name = "polkadot-panic-alerter-config-vol"
  }
  data = {
    "internal_config_alerts.ini" = "${file("${path.module}/../k8s/polkadot-panic-alerter-configs-template/internal_config_alerts.ini")}"
    "internal_config_main.ini" = "${file("${path.module}/../k8s/polkadot-panic-alerter-configs-template/internal_config_main.ini")}"
    "user_config_main.ini" = "${templatefile("${path.module}/../k8s/polkadot-panic-alerter-configs-template/user_config_main.ini", { "telegram_alert_chat_id" : var.telegram_alert_chat_id, "telegram_alert_chat_token": var.telegram_alert_chat_token } )}"
    "user_config_nodes.ini" = "${templatefile("${path.module}/../k8s/polkadot-panic-alerter-configs-template/user_config_nodes.ini", {"polkadot_stash_account_address": var.polkadot_stash_account_address})}"
    "user_config_repos.ini" = "${file("${path.module}/../k8s/polkadot-panic-alerter-configs-template/user_config_repos.ini")}"
  }
}

resource "null_resource" "push_containers" {

  triggers = {
    host = md5(module.terraform-gke-blockchain.kubernetes_endpoint)
    cluster_ca_certificate = md5(
      module.terraform-gke-blockchain.cluster_ca_certificate,
    )
  }
  provisioner "local-exec" {
    command = <<EOF


find ${path.module}/../docker -mindepth 1 -type d  -printf '%f\n'| while read container; do
  
  pushd ${path.module}/../docker/$container
  cat << EOY > cloudbuild.yaml
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', "gcr.io/${local.blockchain_project_id}/$container:latest", '.']
images: ["gcr.io/${local.blockchain_project_id}/$container:latest"]
EOY
  gcloud builds submit --project ${local.blockchain_project_id} --config cloudbuild.yaml .
  rm cloudbuild.yaml
  popd
done
EOF
  }
}

resource "null_resource" "apply" {
  provisioner "local-exec" {

    command = <<EOF
if [ "${module.terraform-gke-blockchain.name} -ne "" ]; then
  gcloud container clusters get-credentials "${module.terraform-gke-blockchain.name}" --region="${module.terraform-gke-blockchain.location}" --project="${local.blockchain_project_id}"
else
  kubectl config set-context "${var.kubernetes_config_context}"
fi

cd ${path.module}/../k8s
cat << EOK > kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- polkadot-private-node.yaml
- polkadot-sentry-nodes.yaml
- polkadot-panic-alerter.yaml

imageTags:
  - name: polkadot-private-node
    newName: gcr.io/${local.blockchain_project_id}/polkadot-private-node
    newTag: latest
  - name: polkadot-sentry-node
    newName: gcr.io/${local.blockchain_project_id}/polkadot-sentry-node
    newTag: latest
  - name: polkadot-archive-downloader
    newName: gcr.io/${local.blockchain_project_id}/polkadot-archive-downloader
    newTag: latest

configMapGenerator:
- name: polkadot-configmap
  literals:
      - ARCHIVE_URL="${var.polkadot_archive_url}"
      - TELEMETRY_URL="${var.polkadot_telemetry_url}"
      - VALIDATOR_NAME="${var.polkadot_validator_name}"
EOK
kubectl apply -k .
rm -v kustomization.yaml
EOF

  }
  depends_on = [ null_resource.push_containers ]
}
