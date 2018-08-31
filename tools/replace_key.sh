#!/bin/bash
git grep -z -l "$1" | xargs -0 sed -i "s/$1/$2/g"

