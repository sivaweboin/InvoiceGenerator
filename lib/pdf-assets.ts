export type PdfFonts = { regular: string; bold: string };
let cached: Promise<{ logo: string; fonts: PdfFonts }> | undefined;
async function base64Asset(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load PDF asset: ${path}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  let value = "";
  for (let i = 0; i < bytes.length; i += 8192)
    value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
export function loadPdfAssets() {
  cached ??= Promise.all([
    base64Asset("/weboin-logo.png"),
    base64Asset("/fonts/calibri.ttf"),
    base64Asset("/fonts/calibri-bold.ttf"),
  ])
    .then(([logo, regular, bold]) => ({
      logo: `data:image/png;base64,${logo}`,
      fonts: { regular, bold },
    }))
    .catch((error) => {
      cached = undefined;
      throw error;
    });
  return cached;
}
