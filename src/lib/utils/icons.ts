export function getIconUrl(item: { logo?: string | null, website?: string | null, name: string }) {
  if (item.logo && item.logo.startsWith('http')) {
    return item.logo;
  }

  if (item.website) {
    // Standard Google favicon service
    return `https://www.google.com/s2/favicons?sz=128&domain=${item.website}`;
  }

  // Fallback: colored circle with first letter
  return null;
}

export function IconFallback({ name, size = 40 }: { name: string, size?: number }) {
  const firstLetter = name.charAt(0).toUpperCase();
  
  // Deterministic color based on name
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  const charCode = name.charCodeAt(0) || 0;
  const color = colors[charCode % colors.length];

  return { color, letter: firstLetter };
}
