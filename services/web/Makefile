ifneq (,$(wildcard ../../.git))
git = git
else
# we are in docker, without the .git directory
git = sh -c 'false'
endif

PWD = $(shell pwd)
SUDO_UID ?= $(shell id -u)
SUDO_GID ?= $(shell id -g)
export NODE_OPTIONS := \
 --trace-deprecation \
 --require ./.pnp.cjs \

# Helper for creating reproducible artifacts
REFERENCE_DATE := 2022-01-01T00:00Z
TAR_FLAGS_REPRODUCIBLE := --sort=name --mtime=$(REFERENCE_DATE)
TAR_CREATE_REPRODUCIBLE := tar --create $(TAR_FLAGS_REPRODUCIBLE)
TOUCH_FLAGS_REPRODUCIBLE := -m -d $(REFERENCE_DATE)
TOUCH_REPRODUCIBLE := touch $(TOUCH_FLAGS_REPRODUCIBLE)

export BUILD_NUMBER ?= local
export BRANCH_NAME ?= $(shell $(git) rev-parse --abbrev-ref HEAD || echo main)
export COMMIT ?= $(shell $(git) rev-parse HEAD || echo HEAD)
export RELEASE := \
	$(shell $(git) describe --tags || echo v0.0.0 | sed 's/-g/+/;s/^v//')
DOCKER_COMPOSE_FLAGS ?= -f docker-compose.yml
DOCKER_COMPOSE := docker-compose $(DOCKER_COMPOSE_FLAGS)

export DOCKER_REGISTRY ?= docker.io
export IMAGE_NODE ?= $(DOCKER_REGISTRY)/node:18.17.0
export IMAGE_PROJECT ?= $(DOCKER_REGISTRY)/overleaf/web

CACHE_CONTENT_SHA := $(shell \
	( \
		echo $(IMAGE_NODE) && \
		$(TAR_CREATE_REPRODUCIBLE) \
			docker_cleanup.sh Dockerfile.cache Dockerfile.yarn \
			package.json yarn.lock .yarnrc.yml \
			frontend/js/packages/ \
	) \
	| sha256sum \
	| cut -d' ' -f1 \
)
YARN_CONTENT_SHA := $(shell \
	( \
		echo $(IMAGE_NODE) && cat Dockerfile.yarn \
	) \
	| sha256sum \
	| cut -d' ' -f1 \
)

export IMAGE_YARN := ci/web:yarn-$(YARN_CONTENT_SHA)
export IMAGE_CACHE_CONTENT_SHA := $(IMAGE_PROJECT):cache-$(CACHE_CONTENT_SHA)

SUFFIX ?=
export IMAGE_CI ?= ci/web:$(BRANCH_NAME)-$(BUILD_NUMBER)$(SUFFIX)

test: lint
lint:
test: format
format:

LINT_RUNNER = \
	docker run --rm --network none -e CACHE_DIR=/tmp $(IMAGE_CI)-dev yarn
LINT_RUNNER_LOCAL = \
	docker run \
	 --rm \
	 --interactive --tty \
	 --network none \
	 --volume $(PWD):$(PWD) --workdir $(PWD) \
	 --env CACHE_DIR=/tmp \
	 $(IMAGE_YARN) \
	 yarn

ifneq (,$(wildcard .yarn/cache/))
LINT_RUNNER = $(LINT_RUNNER_LOCAL)

LOCAL_YARN_TARGETS = \
	lint_full lint_partial lint_fix_full lint_fix_partial \
	format_full format_partial format_fix_full format_fix_partial \
	type_check \
	test_frontend \

$(LOCAL_YARN_TARGETS): ensure_yarn_exists
endif

test: type_check
type_check:
	$(LINT_RUNNER) tsc --noEmit

ifeq (,$(GIT_PREVIOUS_SUCCESSFUL_COMMIT))
GIT_PREVIOUS_SUCCESSFUL_COMMIT := $(shell \
	$(git) rev-parse --abbrev-ref --symbolic-full-name main@{u} . 2>/dev/null\
	| grep -e /main \
	|| echo origin/main)
endif

NEED_FULL_LINT := $(shell \
	$(git) diff $(GIT_PREVIOUS_SUCCESSFUL_COMMIT) --name-only -- . \
	| grep --max-count=1 \
		-e .eslintignore \
		-e .eslintrc \
		-e yarn.lock \
)

ifeq (,$(NEED_FULL_LINT))
lint: lint_partial
lint_fix: lint_fix_partial
else
lint: lint_full
lint_fix: lint_fix_full
endif

RUN_LINT := $(LINT_RUNNER) eslint
RUN_LINT_FIX := $(LINT_RUNNER_LOCAL) eslint
lint_full:
	$(RUN_LINT) .

lint_fix_full:
	$(RUN_LINT_FIX) --fix .

FILES_FOR_FORMAT := $(wildcard $(shell \
	$(git) diff $(GIT_PREVIOUS_SUCCESSFUL_COMMIT) --name-only -- . \
	| grep --invert-match \
		-e vendor \
	| grep \
		-e '\.js$$' \
		-e '\.json$$' \
		-e '\.css$$' \
		-e '\.less$$' \
		-e '\.ts$$' \
		-e '\.tsx$$' \
	| sed 's|^services/web/||' \
))
FILES_FOR_LINT := $(shell \
	echo $(FILES_FOR_FORMAT) \
	| xargs -n1 \
	| grep -v \
		-e '\.json$$' \
		-e '\.css$$' \
		-e '\.less$$' \
)

lint_partial:
ifneq (,$(FILES_FOR_LINT))
	$(RUN_LINT) $(FILES_FOR_LINT)
endif

lint_fix_partial:
ifneq (,$(FILES_FOR_LINT))
	$(RUN_LINT_FIX) --fix $(FILES_FOR_LINT)
endif

NEED_FULL_FORMAT ?= $(shell \
	$(git) diff $(GIT_PREVIOUS_SUCCESSFUL_COMMIT) --name-only -- . \
	| grep --max-count=1 \
		-e .prettierignore \
		-e .prettierrc \
		-e yarn.lock \
)

ifeq (,$(NEED_FULL_FORMAT))
format: format_partial
format_fix: format_fix_partial
else
format: format_full
format_fix: format_fix_full
endif

RUN_FORMAT := $(LINT_RUNNER) prettier
RUN_FORMAT_FIX := $(LINT_RUNNER_LOCAL) prettier
format_full:
	$(RUN_FORMAT) './**/*.{js,json,css,less,mjs,ts,tsx}' --list-different
format_fix_full:
	$(RUN_FORMAT_FIX) './**/*.{js,json,css,less,mjs,ts,tsx}' --write

format_partial:
ifneq (,$(FILES_FOR_FORMAT))
	$(RUN_FORMAT) $(FILES_FOR_FORMAT) --list-different
endif
format_fix_partial:
ifneq (,$(FILES_FOR_FORMAT))
	$(RUN_FORMAT_FIX) $(FILES_FOR_FORMAT) --write
endif

FRONTEND_DOCKER_COMPOSE := COMPOSE_PROJECT_NAME=frontend_web $(DOCKER_COMPOSE)

test: test_frontend
test_frontend:
	$(FRONTEND_DOCKER_COMPOSE) run --rm test_frontend

dist: build_lngs_full
build_lngs_full:
	node build/translations

LNGS := $(patsubst locales/%.json,generated/lng/%.js,$(wildcard locales/*.json))
build_lng: $(LNGS)
$(LNGS): $(wildcard build/translations/*.js)
$(LNGS): locales/en.json
$(LNGS): generated/lng/%.js: locales/%.json
	node build/translations $*

dist: esbuild_build
esbuild_build:
	node esbuild.js build

esbuild_watch:
	node esbuild.js watch

esbuild_serve:
	node esbuild.js serve

dist: populatePublicVendor
populatePublicVendor:
	node populatePublicVendor.js

dist: output/
	cp LICENSE public/LICENSE
	bash compress.sh
	$(TAR_CREATE_REPRODUCIBLE) -C public . \
	| gzip -6 \
	> output/public.tar.gz
	sha256sum output/public.tar.gz \
	| cut -d' ' -f1 \
	> output/public.tar.gz.checksum.txt
	$(TOUCH_REPRODUCIBLE) output/public.tar.gz*

clean_ci_stage: clean_output
clean_output:
ifneq (,$(wildcard output/* output/.*))
	docker run --rm \
		--volume $(PWD)/output:/home/node \
		--user node \
		--network none \
		$(IMAGE_NODE) \
		sh -c 'find /home/node -mindepth 1 | xargs rm -rfv'
	rm -rfv output
endif

ensure_cache_exists:
	$(MAKE) pull_cache || $(MAKE) build_and_publish_cache

pull_cache:
	docker pull $(IMAGE_CACHE_CONTENT_SHA)

ensure_yarn_exists:
	docker images -q $(IMAGE_YARN) | grep -q -e . || $(MAKE) build_yarn

build_yarn:
	docker build \
		--pull \
		--force-rm=true \
		--build-arg IMAGE_NODE=$(IMAGE_NODE) \
		--tag $(IMAGE_YARN) \
		--file Dockerfile.yarn \
		.

build_and_publish_cache: build_yarn
	docker build \
		--force-rm=true \
		--build-arg IMAGE_YARN=$(IMAGE_YARN) \
		--tag $(IMAGE_CACHE_CONTENT_SHA) \
		--file Dockerfile.cache \
		.
	docker push $(IMAGE_CACHE_CONTENT_SHA)

prepare_ci_stage: build_dev
build_dev:
	docker build \
		--force-rm=true \
		--build-arg IMAGE_CACHE_CONTENT_SHA=$(IMAGE_CACHE_CONTENT_SHA) \
		--tag $(IMAGE_CI)-dev \
		--file Dockerfile.dev \
		.

prepare_ci_stage: output/
output/:
	mkdir --parents --mode=777 output

clean_ci_stage: clean_stage_images
clean_stage_images:
	docker rmi --force $(IMAGE_CI)-dev $(IMAGE_YARN)

clean_ci_stage: clean_stale_cache
# Delete all but the last three cache images (tail indexes from 1)
clean_stale_cache:
	docker images --format '{{.Repository}}:{{.Tag}}' \
	| grep -e '$(IMAGE_PROJECT):cache-' \
	| grep -v -e '$(IMAGE_CACHE_CONTENT_SHA)' \
	| tail -n +4 \
	| xargs -r docker rmi --force

.PHONY: output/public.tar.gz
output/public.tar.gz: output/
	docker run \
		--rm \
		--user root \
		--volume $(PWD)/output:/overleaf/services/web/output \
		--entrypoint make \
		$(IMAGE_CI)-dev \
		dist

clean/public.tar.gz:
	rm -f output/public.tar.gz output/public.tar.gz.checksum.txt

.PHONY: clean test test_clean build
