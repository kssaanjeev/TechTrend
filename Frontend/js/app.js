document.addEventListener("DOMContentLoaded", () => {
  const feedContainer = document.getElementById("articlesFeedContainer");
  const safeUrl = (url) => {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "#";
    } catch {
      return "#";
    }
  };

  if (feedContainer) {
    feedContainer.addEventListener("click", async (e) => {
      const keywordEl = e.target.closest("[data-keyword]");
      if (keywordEl) {
        const kw = keywordEl.dataset.keyword;
        const cb = document.querySelector(`#keywordCheckboxes input[value="${CSS.escape(kw)}"]`);
        if (cb) {
          cb.checked = true;
          cb.dispatchEvent(new Event("change", { bubbles: true }));
        }
        return;
      }

      const saveBtn = e.target.closest("[data-save-id]");
      if (saveBtn && typeof window.toggleSavedArticle === "function") {
        window.toggleSavedArticle(saveBtn.dataset.saveId);
        if (typeof window.renderDashboard === "function") window.renderDashboard();
        return;
      }

      const citeBtn = e.target.closest("[data-citation]");
      if (citeBtn && citeBtn.dataset.citation) {
        try {
          await navigator.clipboard.writeText(citeBtn.dataset.citation);
          if (typeof window.showToast === "function") window.showToast("Citation copied to clipboard.");
        } catch {
          if (typeof window.showToast === "function") window.showToast("Unable to copy citation.");
        }
      }
    });
  }

  window.renderArticleCards = function renderArticleCards(articles = [], savedIds = []) {
    if (!feedContainer) return;
    if (!articles.length) {
      feedContainer.innerHTML = `<div class="text-center text-secondary py-4">No articles match the active filters.</div>`;
      return;
    }

    const savedSet = new Set(savedIds);
    feedContainer.innerHTML = articles.map((a) => {
      const isSaved = savedSet.has(String(a.id));
      const href = safeUrl(a.url);
      const pills = (a.keywords || []).map((k) =>
        `<span class="keyword-pill" data-keyword="${String(k).replaceAll('"', """)}">${k}</span>`
      ).join("");
      const citation = a.citation || `${a.title || "Untitled"} (${a.source || "Source"}, ${a.date || ""})`;

      return `
        <article class="article-card">
          <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
            <div>
              <span class="badge ${a.sourceType === "Research Paper" ? "source-pill-paper" : "source-pill-news"} me-1">${a.sourceType || "Article"}</span>
              <span class="badge bg-secondary-subtle text-light">${a.category || "General"}</span>
            </div>
            <small class="text-secondary">${a.date || ""}</small>
          </div>
          <h5 class="fw-bold mb-2">${a.title || "Untitled"}</h5>
          <p class="small mb-2">${a.summary || ""}</p>
          <div class="mb-3">${pills}</div>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-sm ${isSaved ? "btn-primary" : "btn-outline-primary"}" data-save-id="${String(a.id).replaceAll('"', """)}">
              <i class="bi ${isSaved ? "bi-bookmark-check-fill" : "bi-bookmark-plus"} me-1"></i>${isSaved ? "Saved" : "Save"}
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" data-citation="${String(citation).replaceAll('"', """)}">
              <i class="bi bi-quote me-1"></i>Copy Citation
            </button>
            <a href="${href}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-secondary">
              Source <i class="bi bi-box-arrow-up-right ms-1"></i>
            </a>
          </div>
        </article>`;
    }).join("");
  };
});
