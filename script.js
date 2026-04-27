const SUPABASE_URL = "https://phetizgmhisvajdkotip.supabase.co";
const SUPABASE_KEY = "sb_publishable_HEauGmRE0MNAROz8dRrSAA_soNtQiBl";
const IMAGE_BUCKET_URL = `${SUPABASE_URL}/storage/v1/object/public/equipment-images`;
const GROUP_EMOJI = {
  "Audio Interfaces": "🎛️",
  "Microphones": "🎙️",
  "Headphones": "🎧",
  "Stands & Arms": "🦾",
  "Cables & Adapters": "🔌",
  "Cameras": "🎥",
  "Lenses": "🔭",
  "Video Interfaces": "📺",
  "Lights": "💡",
  "Controllers": "🎚️",
  "Storage": "💾",
  "Other": "📦"
};
let equipment = [];
let customKit = {};
function toTitleCase(value) {
  return String(value || "Other").replace(/_/g, " ").replace(/\w\S*/g, text => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());
}
function googleImageSearchUrl(name) {
  return `https://www.google.com/search?q=${encodeURIComponent(name)}&udm=2&tbs=ic:trans`;
}
function groupByUiGroup(items) {
  return items.reduce((acc, item) => {
    const key = item.ui_group || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
function sortedGroups(grouped) {
  return Object.keys(grouped).sort((a, b) => {
    const aOrder = equipment.find(item => item.ui_group === a)?.ui_group_order ?? 999;
    const bOrder = equipment.find(item => item.ui_group === b)?.ui_group_order ?? 999;
    return aOrder - bOrder || a.localeCompare(b);
  });
}
function imageUrlFor(item) {
  return `${IMAGE_BUCKET_URL}/${item.model_id}.png`;
}
async function fetchSupabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}
function renderCard(item) {
  const card = document.createElement("article");
  card.className = "card";
  const imageUrl = imageUrlFor(item);
  const manufacturerUrl = item.manufacturer_url || null;
  const fallbackUrl = googleImageSearchUrl(item.full_name);
  const title = manufacturerUrl ? `<a href="${manufacturerUrl}" target="_blank" rel="noopener noreferrer">${item.full_name}</a>` : item.full_name;
  card.innerHTML = `
    <div class="image-wrap" title="Copy Model ID">
      <img src="${imageUrl}" alt="${item.full_name}" loading="lazy" />
      <div class="fallback">🔎</div>
      <div class="copy-badge"></div>
    </div>
    <div class="category">${toTitleCase(item.ui_group || item.category || "Other")} / ${toTitleCase(item.subcategory || "Other")}</div>
    <h3>${title}</h3>
    <div class="meta">
      <span class="available">${item.available_units} / ${item.total_units} Available</span>
    </div>
  `;
  const img = card.querySelector("img");
  const fallback = card.querySelector(".fallback");
  const imageWrap = card.querySelector(".image-wrap");
  const badge = card.querySelector(".copy-badge");
  img.onerror = () => {
    img.style.display = "none";
    fallback.style.display = "flex";
    imageWrap.title = "Find Transparent Image";
  };
  imageWrap.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    if (img.style.display === "none") {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      await navigator.clipboard.writeText(item.model_id);
      badge.textContent = item.model_id;
      badge.style.opacity = "1";
      setTimeout(() => {
        badge.style.opacity = "0";
        badge.textContent = "";
      }, 1100);
    } catch (e) {
      console.error("copy failed", e);
    }
  });
  return card;
}
function renderEquipment() {
  const content = document.getElementById("equipment-content");
  const grouped = groupByUiGroup(equipment);
  content.innerHTML = "";
  sortedGroups(grouped).forEach(group => {
    const section = document.createElement("section");
    const title = document.createElement("h2");
    const grid = document.createElement("div");
    title.className = "section-title";
    title.textContent = `${GROUP_EMOJI[group] || GROUP_EMOJI.Other} ${group}`;
    grid.className = "grid";
    grouped[group].forEach(item => grid.appendChild(renderCard(item)));
    section.appendChild(title);
    section.appendChild(grid);
    content.appendChild(section);
  });
}
async function loadEquipment() {
  const content = document.getElementById("equipment-content");
  content.innerHTML = `<div class="loading">Loading equipment…</div>`;
  try {
    equipment = await fetchSupabase("model_availability?select=*&order=ui_group_order.asc,sort_order.asc,full_name.asc");
    renderEquipment();
    setupBuilderFilters();
    renderBuilderOptions();
  } catch (error) {
    content.innerHTML = `<div class="error">Could not load equipment. Check Supabase key/API settings.</div>`;
    console.error(error);
  }
}
function setupBuilderFilters() {
  const groupSelect = document.getElementById("builder-group");
  const groups = sortedGroups(groupByUiGroup(equipment));
  groupSelect.innerHTML = `<option value="all">All Groups</option>`;
  groups.forEach(group => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = `${GROUP_EMOJI[group] || GROUP_EMOJI.Other} ${group}`;
    groupSelect.appendChild(option);
  });
}
function filteredBuilderEquipment() {
  const search = document.getElementById("builder-search").value.trim().toLowerCase();
  const group = document.getElementById("builder-group").value;
  return equipment.filter(item => {
    const matchesGroup = group === "all" || item.ui_group === group;
    const matchesSearch = !search || `${item.full_name} ${item.ui_group} ${item.category} ${item.subcategory} ${item.capability_role}`.toLowerCase().includes(search);
    return matchesGroup && matchesSearch;
  });
}
function renderBuilderOptions() {
  const container = document.getElementById("builder-options");
  const items = filteredBuilderEquipment();
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = `<div class="empty">No equipment found.</div>`;
    return;
  }
  items.forEach(item => {
    const button = document.createElement("button");
    button.className = "builder-option";
    button.innerHTML = `
      <div class="option-thumb">
        <img src="${imageUrlFor(item)}" alt="${item.full_name}" loading="lazy" />
        <span style="display:none">🔎</span>
      </div>
      <div>
        <div class="option-name">${item.full_name}</div>
        <div class="option-meta">${toTitleCase(item.ui_group || item.category)} / ${toTitleCase(item.subcategory)}</div>
      </div>
      <div class="option-count">${item.available_units} / ${item.total_units}</div>
    `;
    const img = button.querySelector("img");
    const fallback = button.querySelector("span");
    img.onerror = () => {
      img.style.display = "none";
      fallback.style.display = "inline";
    };
    button.onclick = () => addToCustomKit(item.model_id);
    container.appendChild(button);
  });
}
function addToCustomKit(modelId) {
  const item = equipment.find(entry => entry.model_id === modelId);
  if (!item) return;
  const current = customKit[modelId] || 0;
  if (current >= Number(item.total_units || 0)) return;
  customKit[modelId] = current + 1;
  renderCustomKit();
}
function removeFromCustomKit(modelId) {
  if (!customKit[modelId]) return;
  customKit[modelId] -= 1;
  if (customKit[modelId] <= 0) delete customKit[modelId];
  renderCustomKit();
}
function clearCustomKit() {
  customKit = {};
  renderCustomKit();
}
function customKitRows() {
  return Object.entries(customKit).map(([modelId, quantity]) => {
    const item = equipment.find(entry => entry.model_id === modelId);
    return { item, quantity };
  }).filter(row => row.item);
}
function renderCustomKit() {
  const container = document.getElementById("builder-items");
  const meta = document.getElementById("builder-summary-meta");
  const rows = customKitRows();
  const totalItems = rows.reduce((sum, row) => sum + row.quantity, 0);
  meta.textContent = rows.length ? `${totalItems} item${totalItems === 1 ? "" : "s"} selected across ${rows.length} model${rows.length === 1 ? "" : "s"}.` : "No items selected.";
  container.innerHTML = "";
  if (!rows.length) {
    container.innerHTML = `<div class="empty">Click equipment on the left to add it here.</div>`;
    return;
  }
  rows.forEach(({ item, quantity }) => {
    const ok = quantity <= Number(item.available_units || 0);
    const row = document.createElement("div");
    row.className = "builder-item";
    row.innerHTML = `
      <div>
        <div class="builder-item-name">${item.full_name}</div>
        <div class="builder-item-sub">${toTitleCase(item.ui_group || item.category)} / ${toTitleCase(item.subcategory)}</div>
        <div class="builder-item-sub ${ok ? "status-ok" : "status-bad"}">${quantity} selected · ${item.available_units} available</div>
      </div>
      <div class="builder-controls">
        <button class="small-button" data-action="minus">−</button>
        <div class="quantity">${quantity}</div>
        <button class="small-button" data-action="plus">+</button>
      </div>
    `;
    row.querySelector('[data-action="minus"]').onclick = () => removeFromCustomKit(item.model_id);
    row.querySelector('[data-action="plus"]').onclick = () => addToCustomKit(item.model_id);
    container.appendChild(row);
  });
}
async function copyCustomKit() {
  const rows = customKitRows();
  if (!rows.length) return;
  const text = rows.map(({ item, quantity }) => `${quantity} × ${item.full_name} (${item.model_id})`).join("\n");
  await navigator.clipboard.writeText(text);
  const button = document.getElementById("copy-kit-button");
  button.textContent = "Copied";
  setTimeout(() => {
    button.textContent = "Copy Kit List";
  }, 900);
}
function setupBuilder() {
  document.getElementById("builder-search").addEventListener("input", renderBuilderOptions);
  document.getElementById("builder-group").addEventListener("change", renderBuilderOptions);
  document.getElementById("copy-kit-button").onclick = copyCustomKit;
  document.getElementById("clear-kit-button").onclick = clearCustomKit;
  renderCustomKit();
}
function setupTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`${tab.dataset.view}-view`).classList.add("active");
    };
  });
}
setupTabs();
setupBuilder();
loadEquipment();
