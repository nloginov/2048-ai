#!/bin/bash

echo "javascript:$(cat js/ai/player.js)runAI();" | uglifyjs 
echo

