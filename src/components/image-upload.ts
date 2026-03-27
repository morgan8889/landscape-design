const VALID_TYPES = new Set(["image/jpeg", "image/png"]);

export function isValidImageType(mimeType: string): boolean {
  return VALID_TYPES.has(mimeType);
}

export function renderImageUpload(
  container: HTMLElement,
  onImageLoaded: (dataUrl: string) => void,
  onCancel: () => void,
): void {
  const wrapper = document.createElement("div");
  wrapper.className = "image-upload";

  const h2 = document.createElement("h2");
  h2.textContent = "Upload an Image of Your Yard";

  const subtitle = document.createElement("p");
  subtitle.className = "subtitle";
  subtitle.textContent =
    "Use a satellite screenshot, drone photo, or survey scan";

  const dropZone = document.createElement("div");
  dropZone.className = "drop-zone";

  const dropLabel = document.createElement("p");
  dropLabel.textContent = "Drag and drop an image here, or click to browse";
  dropLabel.className = "drop-label";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".jpg,.jpeg,.png";
  fileInput.className = "file-input";
  fileInput.hidden = true;

  const error = document.createElement("p");
  error.className = "upload-error";
  error.hidden = true;

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn btn-secondary";
  cancelBtn.textContent = "Back to address search";

  dropZone.append(dropLabel, fileInput);
  wrapper.append(h2, subtitle, dropZone, error, cancelBtn);
  container.textContent = "";
  container.appendChild(wrapper);

  function handleFile(file: File): void {
    if (!isValidImageType(file.type)) {
      error.textContent = "Please upload a JPG or PNG image.";
      error.hidden = false;
      return;
    }
    error.hidden = true;
    const reader = new FileReader();
    reader.onload = () => {
      onImageLoaded(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  });

  cancelBtn.addEventListener("click", onCancel);
}
