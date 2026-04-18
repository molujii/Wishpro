# Module 6 – Authentication Spec

## Purpose
Manage API keys for optional cloud services (secure local keychain + env fallback).

## Requirements
- LocalAuth: read keys from env or in-memory store
- KeychainAuth: store/retrieve via OS keychain (mac: keytar)
- UI to enter/clear API keys per service

## Definition of Done
- [ ] Keys retrievable via getApiKey()
- [ ] Keys survive app restart (keychain)
- [ ] UI masked input for key entry
