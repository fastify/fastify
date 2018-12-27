#! /bin/bash


unknownLicenses=`license-checker --production --csv | grep -v '"MIT"' | grep -v '"ISC"' | grep -v '"BSD-3-Clause"' | grep -v '"BSD-2-Clause"'`
unknownLicenseCount=`echo "$unknownLicenses" | wc -l`

if [ "$unknownLicenseCount" -eq 1 ]; then
  echo 'Licenses are OK'
else
  echo 'Unknown License!'
  echo "$unknownLicenses"
  exit 1
fi
