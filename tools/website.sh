#! /bin/bash

NODE_VER=`node -v`

if [[ $NODE_VER =~ ^v6 && $TRAVIS_PULL_REQUEST == "false" && $TRAVIS_BRANCH == "master" ]]; then
  curl -X POST --header 'Content-Type: application/json' "https://circleci.com/api/v1.1/project/github/fastify/website?circle-token=$CIRCLECI_TOKEN"
fi
