export type LoadedImage = { dataUrl: string; width: number; height: number };

/** Dessine une image sur un canvas pour en tirer un data URL exploitable par jsPDF — échoue
 * silencieusement (élément simplement omis du PDF) plutôt que de bloquer le téléchargement.
 * Partagé entre la facture (photo par article) et l'export PDF comptabilité (photo par produit). */
export async function loadImage(src: string, format: "JPEG" | "PNG"): Promise<LoadedImage | null> {
  if (!src) return null;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image load failed"));
      img.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = loaded.naturalWidth;
    canvas.height = loaded.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(loaded, 0, 0);
    return {
      dataUrl: canvas.toDataURL(format === "PNG" ? "image/png" : "image/jpeg"),
      width: loaded.naturalWidth,
      height: loaded.naturalHeight,
    };
  } catch {
    return null;
  }
}

/** Dimensions (mm ou px selon l'unité du document) d'une image centrée dans une boîte carrée, ratio préservé. */
export function fitInBox(imgWidth: number, imgHeight: number, box: number) {
  const scale = Math.min(box / imgWidth, box / imgHeight);
  return { w: imgWidth * scale, h: imgHeight * scale };
}
