import { getCountries, getCountryCallingCode } from "libphonenumber-js";

function flagEmoji(code: string): string {
  return [...code].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join("");
}

function buildCountryOptions(select: HTMLSelectElement): void {
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  const countries = getCountries()
    .map(code => ({ code, name: displayNames.of(code) ?? code, dial: getCountryCallingCode(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Not set";
  select.appendChild(placeholder);

  for (const { code, name, dial } of countries) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = `${flagEmoji(code)} +${dial} ${name}`;
    select.appendChild(opt);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const { method = "overlay", defaultCountryCode = "" } = await chrome.storage.sync.get([
    "method",
    "defaultCountryCode",
  ]) as { method?: string; defaultCountryCode?: string };

  const radio = document.querySelector<HTMLInputElement>(`input[value="${method}"]`);
  if (radio) radio.checked = true;

  const countrySelect = document.getElementById("country-select") as HTMLSelectElement;
  buildCountryOptions(countrySelect);
  countrySelect.value = defaultCountryCode;

  document.getElementById("spinner")!.style.display = "none";
  document.getElementById("main")!.style.display = "block";

  const savedEl = document.getElementById("saved")!;
  let hideTimer: ReturnType<typeof setTimeout>;

  function flashSaved(): void {
    clearTimeout(hideTimer);
    savedEl.classList.add("visible");
    hideTimer = setTimeout(() => savedEl.classList.remove("visible"), 1500);
  }

  document.querySelectorAll<HTMLInputElement>('input[name="method"]').forEach((r) => {
    r.addEventListener("change", async () => {
      await chrome.storage.sync.set({ method: r.value });
      flashSaved();
    });
  });

  countrySelect.addEventListener("change", async () => {
    await chrome.storage.sync.set({ defaultCountryCode: countrySelect.value });
    flashSaved();
  });
});
