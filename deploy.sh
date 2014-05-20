#!/bin/bash

echo "javascript:$(cat js/ai/player.js)runAI();" | yuicompressor --type js
echo 
