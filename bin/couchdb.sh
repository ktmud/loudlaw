#!/bin/bash
dbhost="https://***:***@couch.dakanfa.com"

curl -k -X POST http://127.0.0.1:5984/_replicate -d "{\"source\":\"idufa_articles\", \"target\":\"$dbhost/idufa_articles\", \"continuous\":true}" -H "Content-Type: application/json"

curl -X POST $dbhost/_fti/local/idufa_articles/_cleanup
