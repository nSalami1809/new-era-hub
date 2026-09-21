import { useRef, useState } from "react";
import { ImagePlus, Star, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { ProductImage } from "@/components/ProductImage";
import { compressImage } from "@/lib/image-compression";
import { removeBackgroundAndCompose } from "@/lib/image-background";

const BUCKET = "product-images";
const MAX_SIZE_MB = 5;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function validate(file: File): boolean {
  if (!ACCEPTED.includes(file.type)) {
    toast(`${file.name} : format non supporté (JPEG, PNG ou WebP uniquement).`, "error");
    return false;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    toast(`${file.name} : fichier trop lourd (max ${MAX_SIZE_MB} Mo).`, "error");
    return false;
  }
  return true;
}

/** Cuts the subject onto a white square with a shadow (via Leonardo.AI's
 * remove-bg model); falls back to a plain flattened/compressed photo if the
 * service can't find a subject, is unreachable, or its credits/key are
 * exhausted/missing. */
async function prepareFile(file: File, removeBg: boolean): Promise<File> {
  if (removeBg) {
    try {
      return await removeBackgroundAndCompose(file);
    } catch {
      /* fall through to the plain pipeline below */
    }
  }
  return compressImage(file);
}

async function uploadOne(file: File, removeBg: boolean): Promise<string | null> {
  if (!validate(file)) return null;
  const prepared = await prepareFile(file, removeBg);
  const ext = prepared.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, prepared, { cacheControl: "31536000" });
  if (error) {
    toast(`Échec de l'envoi de ${file.name} : ${error.message}`, "error");
    return null;
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function ImageUploader({
  images,
  onChange,
  error,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  error?: string | undefined;
}) {
  const [uploading, setUploading] = useState(false);
  const [removeBg, setRemoveBg] = useState(true);
  const [progress, setProgress] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setUploading(true);
    // Sequential on purpose, so progress feedback stays accurate and a
    // multi-photo upload doesn't burn through API credits in a burst.
    const uploaded: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress(
        removeBg
          ? `Suppression du fond (${i + 1}/${files.length})...`
          : `Envoi (${i + 1}/${files.length})...`,
      );
      const url = await uploadOne(files[i]!, removeBg);
      if (url) uploaded.push(url);
    }
    if (uploaded.length > 0) onChange([...images, ...uploaded]);
    setProgress(null);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function makeMain(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    if (item === undefined) return;
    next.unshift(item);
    onChange(next);
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Photos du produit</label>
      <p className="mb-2 text-xs text-muted-foreground">
        La première image est la photo principale. JPEG, PNG ou WebP, {MAX_SIZE_MB} Mo max.
      </p>
      <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} />
        Détourer automatiquement le fond (fond blanc + ombre)
      </label>

      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div key={src + i} className="group relative h-24 w-24 border border-border bg-white">
            <ProductImage src={src} alt="" className="h-full w-full object-contain p-1" />
            {i === 0 ? (
              <span className="absolute left-1 top-1 bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background">
                Principale
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeMain(i)}
                className="absolute left-1 top-1 hidden bg-background/90 p-1 text-muted-foreground hover:text-foreground group-hover:block"
                aria-label="Définir comme image principale"
                title="Définir comme image principale"
              >
                <Star size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 bg-background/90 p-1 text-muted-foreground hover:text-destructive"
              aria-label="Supprimer cette image"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={`grid h-24 w-24 place-items-center border border-dashed text-muted-foreground hover:border-border-strong hover:text-foreground ${
            error ? "border-destructive" : "border-border-strong"
          }`}
        >
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
      {progress && <p className="mt-2 text-xs text-muted-foreground">{progress}</p>}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}
