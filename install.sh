#!/bin/bash

composer install
./vendor/bin/robo sql:sync
./vendor/bin/robo site:update
./vendor/bin/robo site:develop
