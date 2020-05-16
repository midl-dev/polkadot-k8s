# This file contains all the interactions with Kubernetes
provider "kubernetes" {
}

#resource "kubernetes_secret" "website_builder_key" {
#  metadata {
#    name = "website-builder-credentials"
#  }
#  data = {
#    json_key = "${base64decode(google_service_account_key.website_builder_key.private_key)}"
#  }
#}
#
resource "null_resource" "push_containers" {

  provisioner "local-exec" {
    command = <<EOF


find ${path.module}/../docker -mindepth 1 -type d  -printf '%f\n'| while read container; do
  
  pushd ${path.module}/../docker/$container
  cat << EOY > cloudbuild.yaml
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', "gcr.io/${var.project}/$container:latest", '.']
images: ["gcr.io/${var.project}/$container:latest"]
EOY
  gcloud builds submit --project ${var.project} --config cloudbuild.yaml .
  rm cloudbuild.yaml
  popd
done
EOF
  }
}

resource "null_resource" "apply" {
  provisioner "local-exec" {
    command = <<EOF

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
    newName: gcr.io/${var.project}/polkadot-private-node
    newTag: latest
  - name: polkadot-sentry-node
    newName: gcr.io/${var.project}/polkadot-sentry-node
    newTag: latest
  - name: polkadot-archive-downloader
    newName: gcr.io/${var.project}/polkadot-archive-downloader
    newTag: latest

configMapGenerator:
- name: polkadot-configmap
  literals:
      - ARCHIVE_URL="https://storage.googleapis.com/kusama-snapshot/ksmcc3-2020-03-27.tar.lz4"
      - SENTRY_1_NODE_KEY="$Yw!nhSV>7&$)"
EOK
kubectl apply -k .
EOF

  }
  depends_on = [ null_resource.push_containers ]
}
