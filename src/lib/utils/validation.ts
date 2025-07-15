// Client-side validation utilities
// These functions can be used in both client and server components

export function validateTwitterUsername(username: string): boolean {
  return /^[A-Za-z0-9_]{1,15}$/.test(username);
}

export function validateGithubUsername(username: string): boolean {
  return /^[A-Za-z0-9]([A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(username);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateAmazonAuthorUrl(url: string): boolean {
  if (!validateUrl(url)) return false;

  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname === 'www.amazon.com' &&
      (parsedUrl.pathname.includes('/author/') ||
        parsedUrl.pathname.includes('/stores/'))
    );
  } catch {
    return false;
  }
}
