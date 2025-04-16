# Mobile Navigation Flow Testing Guide

This guide provides instructions for testing the mobile navigation flow in the RSS reader application. The application is designed to be fully responsive and provides a seamless experience on both desktop and mobile devices.

## Mobile Navigation States

The mobile navigation flow has three main states:

1. **Feeds Selection State**: The sidebar showing feed categories and feeds
2. **Articles List State**: The list of articles from the selected feed
3. **Article Detail State**: The full content view of a selected article

On mobile devices, these states are shown one at a time, with navigation controls to move between them.

## Manual Testing Steps

Follow these steps to manually test the mobile navigation flow:

### Test Case 1: Basic Navigation Flow

1. **Starting Point**: Open the application on a mobile device or using responsive mode in your browser's dev tools
2. **Verify Initial State**: The feeds sidebar should be visible
3. **Select a Feed**: Tap on a feed from the sidebar
4. **Verify Articles List**: The article list for the selected feed should appear, and the sidebar should be hidden
5. **Select an Article**: Tap on an article from the list
6. **Verify Article Detail**: The full content of the article should be displayed, and the article list should be hidden
7. **Navigate Back to Articles**: Tap on the "← Back to articles" button
8. **Verify Return to List**: The article list should be visible again
9. **Navigate Back to Feeds**: Tap on the "← Back to feeds" button
10. **Verify Return to Sidebar**: The feeds sidebar should be visible again

### Test Case 2: Feed Selection Persistence

1. **Starting Point**: Open the application on a mobile device
2. **Select a Feed**: Tap on a feed from the sidebar
3. **Verify Articles List**: The article list should appear
4. **Return to Feeds**: Tap on the "← Back to feeds" button
5. **Select the Same Feed Again**: Tap on the same feed
6. **Verify Articles List**: The article list should show the same articles as before

### Test Case 3: Article Selection Persistence

1. **Starting Point**: Open the application on a mobile device
2. **Navigate to Articles**: Select a feed to view its articles
3. **Select an Article**: Tap on an article to view its content
4. **Return to Articles List**: Tap on the "← Back to articles" button
5. **Select the Same Article Again**: Tap on the same article
6. **Verify Article Content**: The article content should display correctly

## Automated Testing

The application includes automated tests for the mobile navigation flow:

1. **Unit Tests**: Located in `client/src/__tests__/MobileNavigation.test.tsx`
   - Tests basic navigation between the three states
   - Verifies content appears correctly in each state

2. **End-to-End Tests**: Optional test script in `scripts/test-mobile-navigation.js`
   - Requires Puppeteer to be installed
   - Simulates user interaction on mobile devices

## Running Automated Tests

To run the unit tests:

```bash
npx jest client/src/__tests__/MobileNavigation.test.tsx
```

To run the E2E tests (if Puppeteer is installed):

```bash
node scripts/test-mobile-navigation.js
```

## Common Issues

- **Sidebar not hiding**: Check if the `sidebarOpen` state is properly toggled
- **Back buttons not working**: Verify event handlers are correctly attached
- **Article content not showing**: Ensure content is loaded and properly displayed in the ArticleView component

## Performance Considerations

- Article content is only fetched when viewing the article detail, not in the list view
- This reduces initial load time and bandwidth usage
- The application uses responsive design principles to adapt to different screen sizes