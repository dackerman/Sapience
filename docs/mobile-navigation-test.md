# Mobile Navigation Flow Test

This document provides a step-by-step guide to manually test the mobile navigation flow in the RSS Reader application.

## Prerequisites

- Access to the RSS Reader application on a mobile device or using browser dev tools in mobile view
- At least one feed configured with articles

## Test 1: Basic Navigation Flow

### Steps:

1. **Open the application**
   - The sidebar with feeds should be visible by default on mobile

2. **Select a feed from the sidebar**
   - Click/tap on a feed (e.g., "Hacker News")
   - Expected: The view should change to show the list of articles from that feed
   - A "← Back to feeds" button should be visible at the top

3. **Select an article from the list**
   - Click/tap on an article title or preview
   - Expected: The view should change to show the full article content
   - A "← Back to articles" button should be visible at the top

4. **Navigate back to the article list**
   - Click/tap the "← Back to articles" button
   - Expected: The view should return to the article list

5. **Navigate back to the feed list**
   - Click/tap the "← Back to feeds" button
   - Expected: The view should return to the feed list in the sidebar

## Test 2: Feed and Article Operations

### Steps:

1. **Select a feed and view an article as in Test 1**

2. **Use article actions**
   - Verify that the bookmark, share, and external link buttons work correctly
   - Expected: Each button should perform its designated action

3. **Refresh feed content**
   - From the article list view, use the refresh button
   - Expected: The feed should refresh and show updated articles if available

## Test 3: Edge Cases

### Steps:

1. **Empty feed**
   - Select a feed with no articles
   - Expected: A "No articles found" message should be displayed

2. **Article with missing content**
   - Select an article that might not have full content
   - Expected: The application should handle it gracefully, possibly showing a "No content available" message

3. **Rapid navigation**
   - Quickly navigate back and forth between views
   - Expected: The application should handle state transitions smoothly without errors

## Results

- [ ] Test 1 Passed
- [ ] Test 2 Passed
- [ ] Test 3 Passed

### Notes
*Add any observations or issues found during testing here:*