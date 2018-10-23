#! /bin/bash

curl -X POST --header 'Content-Type: application/json' "https://circleci.com/api/v1.1/project/github/fastify/website?circle-token=$CIRCLECI_TOKEN"
