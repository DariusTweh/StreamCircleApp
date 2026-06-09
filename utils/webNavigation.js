export function navigateToHomeMode(navigation, mode) {
  navigation.navigate('MainDrawer', {
    screen: 'Home',
    params: {
      screen: 'Search',
      params: { mode },
    },
  });
}

export function navigateToDrawerScreen(navigation, screen) {
  const parent = navigation.getParent();

  if (parent?.navigate) {
    parent.navigate(screen);
    return;
  }

  navigation.navigate('MainDrawer', { screen });
}

export function navigateToSearchResults(navigation, query) {
  const trimmedQuery = String(query || '').trim();

  if (!trimmedQuery) {
    return;
  }

  navigation.navigate('SearchResultScreen', { query: trimmedQuery });
}
