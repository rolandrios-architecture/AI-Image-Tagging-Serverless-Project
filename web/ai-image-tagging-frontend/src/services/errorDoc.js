export async function logError({ title, context, message, stack }) {
  // Only attempt during dev (Vite exposes MODE via import.meta.env.MODE)
  if (import.meta.env.MODE !== 'development') return;

  try {
    await fetch('/__log_error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, context, message, stack }),
    });
  } catch (e) {
    // don't crash the app if logging fails
    console.warn('errorDoc.logError failed', e);
  }
}

export default { logError };
