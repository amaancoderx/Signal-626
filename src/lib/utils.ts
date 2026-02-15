export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function parseLocation(location: string | null): {
  city: string | null;
  state: string | null;
  country: string | null;
} {
  if (!location) return { city: null, state: null, country: null };

  const parts = location.split(',').map((s) => s.trim());

  if (parts.length >= 3) {
    return { city: parts[0], state: parts[1], country: parts[2] };
  }
  if (parts.length === 2) {
    return { city: parts[0], state: parts[1], country: null };
  }
  return { city: parts[0], state: null, country: null };
}

export function extractYear(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    if (year >= 1400 && year <= 2026) return year;
    return null;
  } catch {
    return null;
  }
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
