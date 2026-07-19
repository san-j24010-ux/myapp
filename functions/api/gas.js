const GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwg0alV9GBUPBylCDX6kh4mi20UjcbBb9bO4F7ThGH_JcffaiZnwmGNPywnSCpzyAL0rA/exec';

export async function onRequestGet({ request }) {
  const incomingUrl = new URL(request.url);
  const gasUrl = new URL(GAS_ENDPOINT);
  gasUrl.search = incomingUrl.search;

  const response = await fetch(gasUrl.toString(), {
    headers: { Accept: 'application/json' },
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
