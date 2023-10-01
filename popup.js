// Function to get the root domain from a hostname
function getRootDomain(hostname) {
    const parts = hostname.split('.').reverse();
    return parts.length > 1 ? `${parts[1]}.${parts[0]}` : hostname;
}

// Function to get a consistent Bootstrap color based on the first letter of the root domain
function getColorForDomain(rootDomain) {
    const colors = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark'];
    const firstLetter = rootDomain.charAt(0).toLowerCase();
    const index = firstLetter.charCodeAt(0) % colors.length;
    return colors[index];
}

// Function to display tabs in the popup
function displayTabs(tabs) {
    const listElement = document.getElementById('tabsList');
    listElement.innerHTML = '';

    for (const tab of tabs) {
        const listItem = document.createElement('li');
        const domain = new URL(tab.url).hostname;
        const rootDomain = getRootDomain(domain);  // Get the root domain

        let colorClass;  // Initialize colorClass variable
        if (tab.active) {
            colorClass = 'light';  // Set to light (white background) if the tab is active
        } else {
            colorClass = getColorForDomain(rootDomain);  // Otherwise, get color based on the first letter of the root domain
        }

        listItem.className = 'list-group-item list-group-item-' + colorClass + ' list-group-item-action';
        listItem.style.cursor = 'pointer';
        listItem.setAttribute('data-title', tab.title.toLowerCase());

        listItem.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent the default link behavior
            chrome.tabs.update(tab.id, { active: true });
            window.close(); // Close the popup after switching to the tab
        });

        const favicon = document.createElement('img');
        favicon.style.width = '16px';
        favicon.style.height = '16px';
        favicon.style.marginRight = '8px';
        favicon.src = 'https://www.google.com/s2/favicons?domain=' + domain;

        listItem.appendChild(favicon);

        const anchor = document.createTextNode(tab.title);
        listItem.appendChild(anchor);

        if (tab.active) {
            const activeText = document.createTextNode(' [ACTIVE]');
            listItem.appendChild(activeText);
        }

        listElement.appendChild(listItem);
    }
}



// Function to toggle the visibility of the domain filter dropdown
function toggleDropdown() {
    const dropdown = document.getElementById('filterDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

// Attach the toggle function to the "Filter by" button
document.getElementById('domainFilterButton').addEventListener('click', toggleDropdown);

// Function to populate the domain filter dropdown and handle selections
function populateDomainFilter() {
    console.log("populateDomainFilter called");
    chrome.tabs.query({}, function(tabs) {
        console.log("chrome.tabs.query returned tabs:", tabs);
        
        // Fetch saved domains first
        chrome.storage.sync.get(['filteredDomains'], function(result) {
            const filteredDomains = result.filteredDomains || [];

            const uniqueDomains = new Set();
            tabs.forEach(tab => {
                const url = new URL(tab.url);
                const domainParts = url.hostname.split('.');
                const mainDomain = domainParts.length > 1 ? domainParts.slice(-2).join('.') : url.hostname;
                uniqueDomains.add(mainDomain);
            });
            
            console.log("uniqueDomains:", Array.from(uniqueDomains));
            const dropdownMenu = document.getElementById('filterDropdown');
            dropdownMenu.innerHTML = '';
            
            uniqueDomains.forEach(domain => {
                const newItem = document.createElement('a');
                newItem.className = 'dropdown-item';
                newItem.href = '#';
                newItem.innerText = domain;

                // Determine which emoji to use based on the saved domains
                const emojiToUse = filteredDomains.includes(domain) ? ' \u2705' : ' \u25EF';
                const emojiSpan = document.createElement('span');
                emojiSpan.textContent = emojiToUse;
                newItem.appendChild(emojiSpan);

                newItem.onclick = function() {
                    // Fetch existing saved domains from storage
                    chrome.storage.sync.get(['filteredDomains'], function(result) {
                        const existingDomains = result.filteredDomains || [];
                        
                        // Check if the domain is already in storage
                        if (existingDomains.includes(domain)) {
                            // Remove the domain from the list
                            const updatedDomains = existingDomains.filter(d => d !== domain);
                            chrome.storage.sync.set({ filteredDomains: updatedDomains }, function() {
                                // Now call your filter function with the updated list of saved domains
                                filterTabsByDomain(updatedDomains);
                                // Update the emoji immediately
                                toggleCheckIcon(newItem, domain, false);
                                // Update the "Active Filters" section
                                updateActiveFilters();
                                // Close the dropdown after 1 second
                                setTimeout(function() {
                                    dropdownMenu.style.display = 'none';
                                }, 1000);
                            });
                        } else {
                            // Add new domain if not already present
                            existingDomains.push(domain);
                            // Save the updated list back to storage
                            chrome.storage.sync.set({ filteredDomains: existingDomains }, function() {
                                // Now call your filter function with the full list of saved domains
                                filterTabsByDomain(existingDomains);
                                // Update the emoji immediately
                                toggleCheckIcon(newItem, domain, true);
                                // Update the "Active Filters" section
                                updateActiveFilters();
                                // Close the dropdown after 1 second
                                setTimeout(function() {
                                    dropdownMenu.style.display = 'none';
                                }, 500);
                            });
                        }
                    });
                };                
                dropdownMenu.appendChild(newItem);
                adjustMarginForActiveFilters();
            });
        });
    });
}

        // Load saved filtered domains from storage
        chrome.storage.sync.get(['filteredDomains'], function(result) {
            const filteredDomains = result.filteredDomains || [];
            const savedDomainsDiv = document.getElementById('savedDomainsList');
            savedDomainsDiv.innerHTML = '';  // Clear existing content
            
            if (filteredDomains.length > 0) {
                const activeFiltersDiv = document.createElement('div');
                activeFiltersDiv.innerText = 'Active Filters:';
                
                // Loop through each saved domain to create a span for it and its removal icon
                filteredDomains.forEach(domain => {
                    const domainSpan = document.createElement('span');
                    domainSpan.innerText = domain;
                    
                    const removeEmoji = document.createElement('span');
                    removeEmoji.innerHTML = ' \u274C';  // Using the Unicode escape sequence
                    removeEmoji.className = 'clickable';  // Make it look clickable
                    removeEmoji.onclick = function() {
                        // Logic to remove this domain from the list of filters
                        removeFilter(domain);
                    };
                    
                    domainSpan.appendChild(removeEmoji);
                    activeFiltersDiv.appendChild(domainSpan);
                });
                
                savedDomainsDiv.appendChild(activeFiltersDiv);
            adjustMarginForActiveFilters();
            }
        });




// Toggle the check icon next to a filtered domain
function toggleCheckIcon(item, domain, checked) {
    if (checked) {
        item.innerHTML = domain + ' \u2705';  // Unicode for ? (checked emoji)
    } else {
        item.innerHTML = domain + ' \u25EF';  // Unicode for ? (unchecked emoji)
    }
}




// Save the filtered domain settings to storage
function saveFilteredDomain(domain) {
    console.log('Saving filtered domain:', domain);
    
    // Fetch existing saved domains from storage
    chrome.storage.sync.get(['filteredDomains'], function(result) {
        const existingDomains = result.filteredDomains || [];
        
        // Check if the domain is already in the list. If not, add it.
        if (!existingDomains.includes(domain)) {
            existingDomains.push(domain);
        }

        // Save the updated list back to storage
        chrome.storage.sync.set({ filteredDomains: existingDomains }, function() {
            console.log('Filtered domain saved:', domain);
        });
    });
}


// Function to filter tabs based on the selected domain
function filterTabsByDomain(domains) {
    chrome.tabs.query({}, function(tabs) {
        console.log("Type of domains:", typeof domains, "Value:", domains);  // Debugging line
        let filteredTabs;

        if (domains.length === 0) {
            // If no domains are specified, show all tabs
            filteredTabs = tabs;
        } else {
            filteredTabs = tabs.filter(tab => {
                const tabDomain = new URL(tab.url).hostname;
                return domains.some(domain => tabDomain === domain || tabDomain.endsWith('.' + domain));
            });
        }

        displayTabs(filteredTabs);
    });
}

function updateActiveFilters() {
    chrome.storage.sync.get(['filteredDomains'], function(result) {
        const filteredDomains = result.filteredDomains || [];
        const savedDomainsDiv = document.getElementById('savedDomainsList');
        savedDomainsDiv.innerHTML = '';  // Clear existing content

        if (filteredDomains.length > 0) {
            const activeFiltersText = document.createElement('span');
            activeFiltersText.textContent = 'Active Filters: ';
            activeFiltersText.style.fontWeight = 'bold';
            activeFiltersText.style.color = '#f92f60';
            activeFiltersText.classList.add('active-filters-text');
            savedDomainsDiv.appendChild(activeFiltersText);

            filteredDomains.forEach(domain => {
                const domainSpan = document.createElement('span');
                domainSpan.textContent = domain;
                domainSpan.style.fontSize = '70%';

                const removeButton = document.createElement('button');
                removeButton.innerHTML = '&#10060;';  // HTML entity for ?
                
                removeButton.classList.add('btn', 'btn-sm', 'btn-remove');
                removeButton.style.verticalAlign = 'middle';  // Center vertically
                removeButton.style.position = 'relative';  // Relative positioning
                removeButton.style.top = '-2px';  // Adjust positioning
                removeButton.onclick = function() {
                    removeFilter(domain);  // Assuming you have a removeFilter function
                    updateActiveFilters();  // Update the active filters
                };

                const separator = document.createElement('span');
                separator.textContent = ' ';
                

                savedDomainsDiv.appendChild(domainSpan);
                savedDomainsDiv.appendChild(removeButton);
                savedDomainsDiv.appendChild(separator);
            });
            adjustMarginForActiveFilters();
        }
    });
}

function adjustMarginForActiveFilters() {
    const wrapperDiv = document.getElementById('domainFilterDiv');
    
    chrome.storage.sync.get(['filteredDomains'], function(result) {
        const filteredDomains = result.filteredDomains || [];
        
        if (wrapperDiv) {
            if (filteredDomains.length > 0) {
                wrapperDiv.style.marginBottom = '0px';
            } else {
                wrapperDiv.style.marginBottom = '7px';
            }
        }
    });
}





// Initialize the domain filter and tab display when the popup is loaded
document.addEventListener('DOMContentLoaded', function() {
    populateDomainFilter();
    chrome.storage.sync.get(['filteredDomains'], function(result) {
        const existingDomains = result.filteredDomains || [];
        filterTabsByDomain(existingDomains);
        updateActiveFilters();  // Initialize "Active Filters"
    });
});


// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keyup', function() {
        const query = this.value.toLowerCase();
        const items = document.querySelectorAll('.list-group-item');
        items.forEach(function(item) {
            const title = item.getAttribute('data-title');
            if (title.includes(query) || query.length <= 0) {
                item.style.display = 'list-item';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

// Function to apply saved filters when the popup is opened
function applySavedFilters() {
    // Read the saved filtered domains from local storage
    chrome.storage.sync.get(['filteredDomains'], function(result) {
        const savedFilteredDomains = result.filteredDomains || [];
        
        // If there are saved domains, filter tabs by them
        if (savedFilteredDomains.length > 0) {
            filterTabsByDomain(savedFilteredDomains);
        } else {
            // If there are no saved domains, display all tabs
            filterTabsByDomain([]);
        }
        adjustMarginForActiveFilters();
    });
}



function removeFilter(domainToRemove) {
    chrome.storage.sync.get(['filteredDomains'], function(result) {
        const existingDomains = result.filteredDomains || [];
        const newDomains = existingDomains.filter(domain => domain !== domainToRemove);
        chrome.storage.sync.set({ filteredDomains: newDomains }, function() {
            // Update the UI
            populateDomainFilter();
            filterTabsByDomain(newDomains);
            updateActiveFilters();  // Update "Active Filters" list
            adjustMarginForActiveFilters();
        });
    });
}




// Call applySavedFilters when the popup is loaded
document.addEventListener('DOMContentLoaded', applySavedFilters);

// Add your actual search logic here
function searchTabs() {
    console.log("Searching tabs...");
}

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchTabs);
    }
});










