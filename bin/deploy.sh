#!/bin/bash -e

gcloud beta functions deploy save-oauth-token --stage-bucket bethewave-calendar-service --trigger-http

# gcloud beta functions deploy calendar-service --stage-bucket bethewave-calendar-service --trigger-http
