#!/bin/bash
# Script to create a threat flag file that the app will detect
# This will simulate pressing the "Report Threat" button after a 10-second countdown

echo "🚨 Starting threat reporting countdown from terminal..."
echo "Will simulate pressing the 'Report Threat' button in 10 seconds..."

# Count down from 10
for i in {10..1}
do
    echo "$i..."
    sleep 1
done

echo "🔴 REPORTING THREAT NOW!"

# Create a threat flag file in the project root - ensure this method works
echo '{"reportThreat": true, "timestamp": '$(date +%s)'}' > threat-flag.json
echo "✅ Created threat-flag.json in project root"

# Try multiple Metro ports (since we're seeing port issues)
# Metro might be running on either 8081 or 19000
METRO_PORTS=("localhost:8081" "localhost:19000")

for METRO_HOST in "${METRO_PORTS[@]}"
do
    echo "Trying Metro host: $METRO_HOST"
    
    # Method 1: Set global variable directly
    echo "📱 Setting global reportThreatFromTerminal to TRUE via Metro"
    curl -s "http://$METRO_HOST/eval" \
      -H "Content-Type:application/json" \
      -d '{"script":"console.log(\"SETTING reportThreatFromTerminal to TRUE\"); global.reportThreatFromTerminal = true; console.log(\"Global variable set to: \" + global.reportThreatFromTerminal);"}' > /dev/null
    
    # Method 2: Try to call the registered function directly
    echo "📱 Trying to call reportThreatFunction directly"
    curl -s "http://$METRO_HOST/eval" \
      -H "Content-Type:application/json" \
      -d '{"script":"if(global.reportThreatFunction && typeof global.reportThreatFunction === \"function\") { console.log(\"Found reportThreatFunction, calling it\"); global.reportThreatFunction(); } else { console.log(\"reportThreatFunction not found or not a function\"); }"}' > /dev/null
done

echo "✅ Threat report signal sent to app"
echo "🚨 If the app doesn't respond, try reopening it or check the console logs"
echo "The app will detect this and trigger the threat alert within a few seconds."
echo "If nothing happens, please restart the app or check the app logs."
echo "You can run this command again if needed." 