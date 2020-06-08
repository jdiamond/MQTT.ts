#!/bin/bash

if [ ! -f ca.key ]; then
  openssl req -x509 -nodes -new -sha256 -days 36135 -newkey rsa:2048 -keyout ca.key -out ca.crt -subj "/CN=CA"
fi

if [ ! -f localhost.csr ]; then
  openssl req -new -nodes -newkey rsa:2048 -keyout localhost.key -out localhost.csr -subj "/CN=localhost"
  openssl x509 -req -sha256 -days 36135 -in localhost.csr -CA ca.crt -CAkey ca.key -CAcreateserial -extfile localhost.conf -out localhost.crt
fi
