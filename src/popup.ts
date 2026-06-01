document.addEventListener("DOMContentLoaded", async () => {
  const { method = "overlay" } = await chrome.storage.sync.get("method");

  const radio = document.querySelector<HTMLInputElement>(
    `input[value="${method as string}"]`
  );
  if (radio) radio.checked = true;

  document.getElementById("spinner")!.style.display = "none";
  document.getElementById("options")!.style.display = "flex";

  const savedEl = document.getElementById("saved")!;
  let hideTimer: ReturnType<typeof setTimeout>;

  document.querySelectorAll<HTMLInputElement>('input[name="method"]').forEach(
    (r) => {
      r.addEventListener("change", async () => {
        await chrome.storage.sync.set({ method: r.value });
        clearTimeout(hideTimer);
        savedEl.classList.add("visible");
        hideTimer = setTimeout(() => savedEl.classList.remove("visible"), 1500);
      });
    }
  );
});
