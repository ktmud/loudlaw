#!/bin/bash
curl -k -X POST http://127.0.0.1:5984/_replicate -d '{"source":"idufa_articles", "target":"https://jesse:howdoyoudowahaha@www.dakanfa.com/_couch/idufa_articles", "continuous":true}' -H "Content-Type: application/json"
