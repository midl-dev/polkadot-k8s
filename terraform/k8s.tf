resource "null_resource" "push_containers" {

  triggers = {
    host = md5(module.terraform-gke-blockchain.kubernetes_endpoint)
    cluster_ca_certificate = md5(
      module.terraform-gke-blockchain.cluster_ca_certificate,
    )
  }
  provisioner "local-exec" {
    interpreter = [ "/bin/bash", "-c" ]
    command = <<EOF
set -e
set -x


find ${path.module}/../docker -mindepth 1 -maxdepth 1 -type d  -printf '%f\n'| while read container; do
  
  pushd ${path.module}/../docker/$container
  cp Dockerfile.template Dockerfile
  sed -i "s/((polkadot_version))/${var.polkadot_version}/" Dockerfile
  cat << EOY > cloudbuild.yaml
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', "gcr.io/${module.terraform-gke-blockchain.project}/$container:latest", '.']
images: ["gcr.io/${module.terraform-gke-blockchain.project}/$container:latest"]
EOY
  gcloud builds submit --project ${module.terraform-gke-blockchain.project} --config cloudbuild.yaml .
  rm -vf Dockerfile
  rm  -vf cloudbuild.yaml
  popd
done
EOF
  }
}

# generate node keys if they are not passed as parameters
# conventiently, ed25519 is happy with random bytes as private key
# unfortunately, terraform does not support generation of sensitive hex data, so we have
# to hack the "random_password" resource to generate a hex
resource "random_password" "private-node-0-key" {
  count = contains(keys(var.polkadot_node_keys), "polkadot-private-node-0") ? 0 : 1
  length = 64
  override_special = "abcdef1234567890"
  upper = false
  lower = false
  number = false
}

resource "kubernetes_namespace" "polkadot_namespace" {
  metadata {
    name = var.kubernetes_namespace
  }
  depends_on = [ module.terraform-gke-blockchain ]
}

# FIXME this is a bug in kustomize where it will not prepend characters to the storageClass requirement
# to address it, we define it here. At some point, later, it will stop being needed.
resource "kubernetes_storage_class" "local-ssd" {
  count = var.kubernetes_name_prefix == "dot" ? 1  : 0
  metadata {
    name = "local-ssd"
  }
  storage_provisioner = "kubernetes.io/gce-pd"
  parameters = {
    type = "pd-ssd"
  }
  depends_on = [ kubernetes_namespace.polkadot_namespace ]
}

# FIXME this is a bug in kustomize where it will not prepend characters to the storageClass requirement
# to address it, we define it here. At some point, later, it will stop being needed.
resource "kubernetes_storage_class" "repd-europe-west1-b-d" {
  count = var.kubernetes_name_prefix == "dot" ? 1  : 0
  metadata {
    name = "repd-europe-west1-b-d"
  }
  storage_provisioner = "kubernetes.io/gce-pd"
  parameters = {
    type = "pd-ssd"
    replication-type = "regional-pd"
    zones = "europe-west1-b, europe-west1-d"
  }
  depends_on = [ kubernetes_namespace.polkadot_namespace ]
}

resource "kubernetes_secret" "polkadot_node_keys" {
  metadata {
    name = "polkadot-node-keys"
    namespace = var.kubernetes_namespace
  }
  data = {
    "${var.kubernetes_name_prefix}-private-node-0" : lookup(var.polkadot_node_keys, "polkadot-private-node-0", length(random_password.private-node-0-key) == 1 ? random_password.private-node-0-key[0].result : "") }
  depends_on = [ kubernetes_namespace.polkadot_namespace ]
}

resource "null_resource" "apply" {
  provisioner "local-exec" {

    interpreter = [ "/bin/bash", "-c" ]
    command = <<EOF
set -e
set -x
gcloud container clusters get-credentials "${module.terraform-gke-blockchain.name}" --region="${module.terraform-gke-blockchain.location}" --project="${module.terraform-gke-blockchain.project}"

mkdir -p ${path.module}/k8s-${var.kubernetes_namespace}
cp -v ${path.module}/../k8s/*yaml* ${path.module}/k8s-${var.kubernetes_namespace}
pushd ${path.module}/k8s-${var.kubernetes_namespace}
cat <<EOK > kustomization.yaml
${templatefile("${path.module}/../k8s/kustomization.yaml.tmpl",
     { "project" : module.terraform-gke-blockchain.project,
       "polkadot_archive_url": var.polkadot_archive_url,
       "polkadot_telemetry_url": var.polkadot_telemetry_url,
       "polkadot_validator_name": var.polkadot_validator_name,
       "chain": var.chain,
       "kubernetes_namespace": var.kubernetes_namespace,
       "kubernetes_name_prefix": var.kubernetes_name_prefix})}
EOK
cat <<EOK > prefixedpv.yaml
${templatefile("${path.module}/../k8s/prefixedpv.yaml.tmpl",
     { "kubernetes_name_prefix": var.kubernetes_name_prefix})}
EOK
cat <<EORPP > regionalpvpatch.yaml
${templatefile("${path.module}/../k8s/regionalpvpatch.yaml.tmpl",
   { "regional_pd_zones" : join(", ", var.node_locations),
     "kubernetes_name_prefix": var.kubernetes_name_prefix})}
EORPP
cat <<EONPN > nodepool.yaml
${templatefile("${path.module}/../k8s/nodepool.yaml.tmpl", {"kubernetes_pool_name": var.kubernetes_pool_name})}
EONPN
kubectl apply -k .
popd
rm -rvf ${path.module}/k8s-${var.kubernetes_namespace}
EOF

  }
  depends_on = [ null_resource.push_containers, kubernetes_namespace.polkadot_namespace ]
}
