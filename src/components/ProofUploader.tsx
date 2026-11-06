import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

// Reuses the existing product-images bucket (already public-read, admin-
// write) under its own folder, instead of a dedicated bucket — avoids
// standing up a new bucket + policies for a single-image, admin-only use
// case. Paths are random UUIDs (see ImageUploader), so public read doesn't
// make them discoverable without already having the URL.
const BUCKET = "product-images";
const FOLDER = "sale-proofs";
const MAX_SIZE_MB = 10;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/** Uploads a transaction proof (payment screenshot, receipt photo...) and
 * returns its public URL, or null on validation/upload failure (toasts the
 * reason). No resize/crop/whitening — that pipeline (compressImage) assumes
 * a product photo on a plain backdrop, which a screenshot isn't. */
export async function uploadProofImage(file: File): Promise<string | null> {
  if (!ACCEPTED.includes(file.type)) {
    toast(`${file.name} : format non supporté (JPEG, PNG ou WebP uniquement).`, "error");
    return null;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    toast(`${file.name} : fichier trop lourd (max ${MAX_SIZE_MB} Mo).`, "error");
    return null;
  }
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${FOLDER}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
  });
  if (error) {
    toast(`Échec de l'envoi du justificatif : ${error.message}`, "error");
    return null;
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function ProofUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const url = await uploadProofImage(file);
    setUploading(false);
    if (url) onChange(url);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border-strong bg-muted/40 p-2">
        <a href={value} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <ProductImage
            src={value}
            alt="Justificatif de transaction"
            width={56}
            className="h-14 w-14 rounded-md border border-border bg-white object-contain p-1"
          />
        </a>
        <div className="min-w-0 flex-1 text-xs text-muted-foreground">
          Justificatif ajouté — cliquez l'image pour l'ouvrir en grand.
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 text-muted-foreground hover:text-destructive"
          aria-label="Retirer le justificatif"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="btn-base btn-outline !min-h-9 !px-3 !py-1.5 text-xs"
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
        Ajouter un justificatif
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG ou WebP, 10 Mo max.</p>
    </div>
  );
}
