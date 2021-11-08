#!/bin/bash

set -euo pipefail

NETWORK_NAME=mqtt-ts
MOSQUITTO_IMAGE=eclipse-mosquitto:2
MOSQUITTO_NAME=mosquitto
DENO_IMAGE=denoland/deno
SUBSCRIBER_NAME=subscriber

if ! docker network inspect $NETWORK_NAME &> /dev/null; then 
  printf "creating docker network $NETWORK_NAME\n"
  docker network create $NETWORK_NAME
fi

if ! docker container inspect $MOSQUITTO_NAME &> /dev/null; then
  printf "starting $MOSQUITTO_NAME\n"
  docker run -d --rm \
    --name $MOSQUITTO_NAME \
    --net $NETWORK_NAME \
    -v $PWD/mosquitto-docker.conf:/mosquitto/config/mosquitto.conf \
    $MOSQUITTO_IMAGE
fi

# Give mosquitto time to start:
sleep 1

printf "\npublishing with mosquitto_pub:\n\n"
docker exec $MOSQUITTO_NAME mosquitto_pub -t foo/bar -m baz -d

if ! docker container inspect $SUBSCRIBER_NAME &> /dev/null; then
  printf "\nstarting $SUBSCRIBER_NAME\n"
  docker run -d --rm \
    --name $SUBSCRIBER_NAME \
    --net $NETWORK_NAME \
    -v $PWD:/mqtt.ts \
    -v $PWD/cache:/deno-dir \
    $DENO_IMAGE \
    run --allow-net \
    /mqtt.ts/tools/sub.ts -u mqtt://$MOSQUITTO_NAME -L debug -t "foo/#" -v
fi

function cleanup {
  printf "\nstopping containers\n\n"
  docker stop $MOSQUITTO_NAME
  docker stop $SUBSCRIBER_NAME
}

trap cleanup EXIT

# Give subscriber time to connect and subscribe:
sleep 1

printf "\nrunning publisher:\n\n"
docker run -it --rm \
  --net $NETWORK_NAME \
  -v $PWD:/mqtt.ts \
  -v $PWD/cache:/deno-dir \
  $DENO_IMAGE \
  run --allow-net \
  /mqtt.ts/tools/pub.ts -u mqtt://$MOSQUITTO_NAME -L debug -t "foo/bar" -m "baz"

printf "\nsubscriber logs:\n\n"
docker logs $SUBSCRIBER_NAME
