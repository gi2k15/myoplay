// src/composables/useSidebarCascade.ts
import { ref } from 'vue';

// Shared global state for sidebar cascade
const mainRail = ref(true); // Default to rail when Level 2 is active
const categoriesCollapsed = ref(false);
const tvGuideChannelsCollapsed = ref(false);

export function useSidebarCascade() {
  /**
   * Expand Level 1 Main Navigation Sidebar.
   * Cascading rule: collapses Level 2 sidebars (categories & EPG channel list).
   */
  const expandMainSidebar = () => {
    mainRail.value = false;
    categoriesCollapsed.value = true;
    tvGuideChannelsCollapsed.value = true;
  };

  /**
   * Collapse Level 1 Main Navigation Sidebar to rail (icon) mode.
   */
  const collapseMainSidebar = () => {
    mainRail.value = true;
  };

  /**
   * Toggle Main Navigation Sidebar rail state.
   */
  const toggleMainSidebar = () => {
    if (mainRail.value) {
      expandMainSidebar();
    } else {
      collapseMainSidebar();
    }
  };

  /**
   * Expand Level 2 Category Sidebar in StreamBrowser.
   * Cascading rule: collapses Level 1 Main Nav sidebar to rail mode.
   */
  const expandCategories = () => {
    categoriesCollapsed.value = false;
    mainRail.value = true;
  };

  /**
   * Collapse Level 2 Category Sidebar.
   * Cascading rule: expands Level 1 Main Nav sidebar.
   */
  const collapseCategories = () => {
    categoriesCollapsed.value = true;
    mainRail.value = false;
  };

  /**
   * Toggle Category Sidebar collapse state.
   */
  const toggleCategories = () => {
    if (categoriesCollapsed.value) {
      expandCategories();
    } else {
      collapseCategories();
    }
  };

  /**
   * Expand Level 2 TV Guide Channels Sidebar.
   * Cascading rule: collapses Level 1 Main Nav sidebar to rail mode.
   */
  const expandTvGuideChannels = () => {
    tvGuideChannelsCollapsed.value = false;
    mainRail.value = true;
  };

  /**
   * Collapse Level 2 TV Guide Channels Sidebar.
   * Cascading rule: expands Level 1 Main Nav sidebar.
   */
  const collapseTvGuideChannels = () => {
    tvGuideChannelsCollapsed.value = true;
    mainRail.value = false;
  };

  /**
   * Toggle TV Guide Channels Sidebar collapse state.
   */
  const toggleTvGuideChannels = () => {
    if (tvGuideChannelsCollapsed.value) {
      expandTvGuideChannels();
    } else {
      collapseTvGuideChannels();
    }
  };

  /**
   * Handle route/page changes to configure optimal default sidebar states.
   */
  const onPageChange = (page: string) => {
    const viewsWithCategorySidebar = ['live', 'movie', 'series'];
    const viewsWithEpgSidebar = ['epg'];

    if (viewsWithCategorySidebar.includes(page)) {
      categoriesCollapsed.value = false;
      mainRail.value = true;
    } else if (viewsWithEpgSidebar.includes(page)) {
      tvGuideChannelsCollapsed.value = false;
      mainRail.value = true;
    } else {
      // Views without Level 2 sidebars (playlists, settings, etc.): Level 1 expands as it is the rightmost sidebar
      mainRail.value = false;
    }
  };

  return {
    mainRail,
    categoriesCollapsed,
    tvGuideChannelsCollapsed,
    expandMainSidebar,
    collapseMainSidebar,
    toggleMainSidebar,
    expandCategories,
    collapseCategories,
    toggleCategories,
    expandTvGuideChannels,
    collapseTvGuideChannels,
    toggleTvGuideChannels,
    onPageChange,
  };
}
