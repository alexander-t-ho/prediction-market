#!/bin/bash

# Phase 4 Simple Test Script
# Tests all Phase 4 APIs via HTTP requests

echo "🚀 Phase 4 API Test Suite"
echo "======================================"
echo ""

PASSED=0
FAILED=0
BASE_URL="http://localhost:3000"

# Helper function to test an endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"

    echo -n "Testing: $name... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s "$url")
    else
        response=$(curl -s -X "$method" -H "Content-Type: application/json" -d "$data" "$url")
    fi

    if echo "$response" | grep -q "success.*true"; then
        echo "✅ PASSED"
        ((PASSED++))
        echo "   Response: $(echo $response | head -c 100)..."
    elif echo "$response" | grep -q "error"; then
        echo "❌ FAILED"
        ((FAILED++))
        echo "   Error: $(echo $response | head -c 200)"
    else
        echo "⚠️  UNKNOWN"
        echo "   Response: $(echo $response | head -c 200)"
    fi
    echo ""
}

echo "📋 Test 1: OMDb API Integration"
echo "-----------------------------------"
test_endpoint "Fetch RT score by IMDb ID (Dune Part Two)" \
    "$BASE_URL/api/admin/rt-score?imdbId=tt15239678"

test_endpoint "Fetch RT score by title (Barbie)" \
    "$BASE_URL/api/admin/rt-score?title=Barbie&year=2023"

echo ""
echo "📋 Test 2: Auto-Resolution System"
echo "-----------------------------------"
test_endpoint "Run auto-resolution cron job" \
    "$BASE_URL/api/cron/auto-resolve"

echo ""
echo "======================================"
echo "📊 Test Summary"
echo ""
echo "Total Tests: $((PASSED + FAILED))"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed"
    exit 1
fi
