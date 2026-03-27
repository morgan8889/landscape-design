interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
}

export async function geocodeAddress(
  query: string,
  mapboxToken: string,
): Promise<GeocodeResult | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=1`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.features || data.features.length === 0) return null;

    const feature = data.features[0];
    return {
      lng: feature.center[0],
      lat: feature.center[1],
      address: feature.place_name,
    };
  } catch {
    return null;
  }
}

export function renderAddressSearch(
  container: HTMLElement,
  onResult: (result: GeocodeResult) => void,
  onFallback: () => void,
  mapboxToken: string,
): void {
  const wrapper = document.createElement("div");
  wrapper.className = "address-search";

  const h1 = document.createElement("h1");
  h1.textContent = "Design Your Yard";

  const subtitle = document.createElement("p");
  subtitle.className = "subtitle";
  subtitle.textContent = "Start by finding your property";

  const form = document.createElement("form");
  form.className = "search-form";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "search-input";
  input.placeholder = "123 Oak Street, Portland, OR";
  input.required = true;

  const button = document.createElement("button");
  button.type = "submit";
  button.className = "search-button";
  button.textContent = "Find My Yard";

  form.appendChild(input);
  form.appendChild(button);

  const error = document.createElement("p");
  error.className = "search-error";
  error.hidden = true;

  const fallbackP = document.createElement("p");
  fallbackP.className = "search-fallback";
  const fallbackBtn = document.createElement("button");
  fallbackBtn.type = "button";
  fallbackBtn.className = "fallback-link";
  fallbackBtn.textContent = "upload your own image";
  fallbackP.append("Or ", fallbackBtn);

  wrapper.append(h1, subtitle, form, error, fallbackP);
  container.textContent = "";
  container.appendChild(wrapper);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    error.hidden = true;
    button.disabled = true;
    button.textContent = "Searching...";

    const result = await geocodeAddress(query, mapboxToken);

    button.disabled = false;
    button.textContent = "Find My Yard";

    if (result) {
      onResult(result);
    } else {
      error.textContent =
        "Address not found. Please try again or upload an image.";
      error.hidden = false;
    }
  });

  fallbackBtn.addEventListener("click", onFallback);
}
