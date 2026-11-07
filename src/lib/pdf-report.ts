import type { jsPDF } from "jspdf";
import logo from "@/assets/logo-new-era-hub-241.jpeg";
import { fitInBox, loadImage } from "@/lib/pdf-image";
import type { StoreSettings } from "@/lib/types";

/** En-tête commun (logo + nom du site + titre + sous-titre) pour tous les
 * exports PDF admin — même identité visuelle que la facture, pour qu'un
 * export téléchargé soit reconnaissable comme venant du site. Retourne la
 * position Y à partir d'où continuer à écrire (ex. avant un autoTable). */
export async function brandedPdfHeader(
  doc: jsPDF,
  settings: StoreSettings | undefined,
  title: string,
  subtitle?: string,
): Promise<number> {
  const logoImg = await loadImage(logo, "JPEG");
  const y = 16;
  if (logoImg) {
    const { w, h } = fitInBox(logoImg.width, logoImg.height, 16);
    doc.addImage(logoImg.dataUrl, "JPEG", 14, y - 9, w, h);
  }
  doc.setFontSize(16);
  doc.text(settings?.storeName ?? "New Era Hub 241", 34, y - 2);
  doc.setFontSize(10);
  doc.text(title, 34, y + 4);

  let cursorY = y + 14;
  if (subtitle) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(subtitle, 14, cursorY);
    doc.setTextColor(0);
    cursorY += 4;
  }
  return cursorY;
}
