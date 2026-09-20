import { useRef, useState } from "react";
import { ImagePlus, Star, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

const BUCKET = "product-images";
const MAX_SIZE_MB = 5;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

async function uploadOne(file: File): Promise<string | null> {
  if (!ACCEPTED.includes(file.type)) {
    toast(`${file.name} : format non supporté (JPEG, PNG ou WebP uniquement).`, "error");
    return null;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    toast(`${file.name} : fichier trop lourd (max ${MAX_SIZE_MB} Mo).`, "error");
    return null;
  }
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "31536000" });
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
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    const files = Array.from(fileList);
    const results = await Promise.all(files.map(uploadOne));
    const uploaded = results.filter((url): url is string => !!url);
    if (uploaded.length > 0) onChange([...images, ...uploaded]);
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

      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div key={src + i} className="group relative h-24 w-24 border border-border bg-white">
            <img src={src} alt="" className="h-full w-full object-contain p-1" />
            {i === 0 ? (
              <span className="absolute left-1 top-1 rounded-sm bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background">
                Principale
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeMain(i)}
                className="absolute left-1 top-1 hidden rounded-sm bg-background/90 p-1 text-muted-foreground hover:text-foreground group-hover:block"
                aria-label="Définir comme image principale"
                title="Définir comme image principale"
              >
                <Star size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 rounded-sm bg-background/90 p-1 text-muted-foreground hover:text-destructive"
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
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}
