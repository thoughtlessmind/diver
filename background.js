// Simple and performant: use badge text as the source of truth
// Empty badge = OFF, "ON" badge = ON

chrome.action.onClicked.addListener(async (tab) => {
  // Get current state from badge (reliable and fast)
  const currentBadge = await chrome.action.getBadgeText({ tabId: tab.id });
  const isCurrentlyOn = currentBadge === "ON";
  
  if (isCurrentlyOn) {
    // Turn OFF: Remove outlines and clear badge
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["removeOutline.js"],
    });
    
    await chrome.action.setBadgeText({
      tabId: tab.id,
      text: "", // Empty = OFF state
    });
  } else {
    // Turn ON: Add outlines and show badge
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["addOutline.js"],
    });
    
    await chrome.action.setBadgeText({
      tabId: tab.id,
      text: "ON",
    });
  }
});