chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({
    text: "",
  });
  // Initialize extension state for all tabs
  chrome.storage.local.clear();
});

chrome.action.onClicked.addListener(async (tab) => {
  // Get the current state from storage (more reliable than badge text)
  const tabStateKey = `tab_${tab.id}_state`;
  const result = await chrome.storage.local.get([tabStateKey]);
  const currentState = result[tabStateKey] || "OFF";

  // Toggle state
  const nextState = currentState === "ON" ? "OFF" : "ON";

  // Save new state to storage
  await chrome.storage.local.set({ [tabStateKey]: nextState });

  // Set the action badge to show current state
  await chrome.action.setBadgeText({
    tabId: tab.id,
    text: nextState,
  });

  if (nextState === "ON") {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["addOutline.js"],
    });
  } else if (nextState === "OFF") {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["removeOutline.js"],
    });

    // Clear the "OFF" badge after 3 seconds (but keep state in storage)
    setTimeout(async () => {
      await chrome.action.setBadgeText({
        tabId: tab.id,
        text: "",
      });
    }, 3000);
  }
});

// Clean up storage when tab is closed to prevent memory bloat
chrome.tabs.onRemoved.addListener((tabId) => {
  const tabStateKey = `tab_${tabId}_state`;
  chrome.storage.local.remove([tabStateKey]);
});
