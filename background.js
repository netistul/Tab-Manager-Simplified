
let youtubeTabs = [];

// Event listener for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        let tabInfo = {
            tabId: tab.id,
            url: tab.url,
            title: tab.title
        };
        youtubeTabs.push(tabInfo);
    }
});

// Event listener for tab removal
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    youtubeTabs = youtubeTabs.filter(tab => tab.tabId !== tabId);
});
