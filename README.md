# Purpose

This repository contains a simple microservice providing a REST-API to demonstrate a KYC migration
use case. It uses OpenAI capabilities to interpret unstructured data and extract a target data structure.

# Getting started

## Requirements

Make sure you have the following software installed:
* Node 18.12.1 or above
* NPM 9.1.2 or above

## Local Setup

Before you can start the service, you need to install all dependencies:

```shell
npm i
```

Before you can run the service, you need to set the following environment variables:

```shell
export OPENAI_API_KEY=<your-api-key>
echo $OPENAI_API_KEY
```

Afterwards, you can run the software
```shell
npm start
```