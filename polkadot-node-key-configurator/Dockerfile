FROM parity/subkey:2.0.0
USER root
# install tools and dependencies
RUN apt-get update --allow-insecure-repositories && \
	DEBIAN_FRONTEND=noninteractive apt-get install -y \
		xxd && \
	apt-get autoremove -y && \
	apt-get clean && \
	find /var/lib/apt/lists/ -type f -not -name lock -delete;
COPY entrypoint.sh /
ENTRYPOINT ["/entrypoint.sh"]
CMD []
