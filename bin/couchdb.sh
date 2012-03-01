#!/bin/bash
dbhost="https://jesse:howdoyoudowahaha@couch.idufa.com"

#curl -k -X POST http://127.0.0.1:5984/_replicate -d "{\"source\":\"idufa_articles\", \"target\":\"$dbhost/idufa_articles\", \"continuous\":true}" -H "Content-Type: application/json"

#curl -k -X POST http://127.0.0.1:5984/_replicate -d "{\"source\":\"idufa_users\", \"target\":\"$dbhost/idufa_users\", \"continuous\":true}" -H "Content-Type: application/json"

curl -k -X POST http://127.0.0.1:5984/_replicate -d "{\"source\":\"$dbhost/idufa_articles\", \"target\":\"idufa_articles\", \"continuous\":true}" -H "Content-Type: application/json"

curl -k -X POST http://127.0.0.1:5984/_replicate -d "{\"source\":\"$dbhost/idufa_users\", \"target\":\"idufa_users\", \"continuous\":true}" -H "Content-Type: application/json"

curl -k -X POST $dbhost/_fti/local/idufa_articles/_cleanup
