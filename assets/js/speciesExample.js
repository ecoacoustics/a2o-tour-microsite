const GRID_TILE_CONTEXT = "oe-grid-tile-context";
let dialogSequence = 0;

class A2OTourSpeciesExample extends HTMLElement {
  #button;
  #image;
  #speciesData = [];
  #species;
  #dialog;
  #largeImage;
  #title;
  #description;
  #examples;
  #unsubscribe;
  #dialogID = `a2otour-species-dialog-${++dialogSequence}`;
  #receiveTileContext = (tile, unsubscribe) => {
    if (unsubscribe && this.#unsubscribe !== unsubscribe) {
      this.#unsubscribe?.();
      this.#unsubscribe = unsubscribe;
    }

    this.#updateSpecies(tile?.model?.tag?.id);
  };

  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
      }

      :host([hidden]) {
        display: none;
      }

      button {
        display: block;
        width: 2.5rem;
        height: 2.5rem;
        overflow: hidden;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: var(--color-card);
        cursor: pointer;
      }

      button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `;

    this.#button = document.createElement("button");
    this.#button.type = "button";
    this.#button.setAttribute("aria-haspopup", "dialog");
    this.#button.addEventListener("click", () => this.#openDialog());

    this.#image = document.createElement("img");
    this.#image.alt = "";
    this.#image.addEventListener("error", () => this.#handleImageError());
    this.#button.append(this.#image);
    shadowRoot.append(style, this.#button);
    this.hidden = true;
  }

  connectedCallback() {
    this.#loadSpeciesData();

    const request = new Event("context-request", {
      bubbles: true,
      composed: true,
    });
    Object.assign(request, {
      context: GRID_TILE_CONTEXT,
      contextTarget: this,
      callback: this.#receiveTileContext,
      subscribe: true,
    });
    this.dispatchEvent(request);
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#closeDialog();
    this.#dialog?.remove();
    this.#dialog = undefined;
  }

  #loadSpeciesData() {
    const payloadID = this.dataset.speciesDataId;
    const payload = payloadID ? document.getElementById(payloadID) : null;

    if (!payload) {
      console.error("Species example data payload was not found.", payloadID);
      this.#speciesData = [];
      this.#setSpecies(null);
      return;
    }

    try {
      const speciesData = JSON.parse(payload.textContent);
      if (!Array.isArray(speciesData)) {
        console.error("Species example data payload must be an array.", payloadID);
        this.#speciesData = [];
        this.#setSpecies(null);
        return;
      }

      this.#speciesData = speciesData;
    } catch (error) {
      console.error("Failed to parse species example data payload.", error);
      this.#speciesData = [];
      this.#setSpecies(null);
    }
  }

  #updateSpecies(tagID) {
    if (tagID === null || tagID === undefined || tagID === "") {
      this.#setSpecies(null);
      return;
    }

    const numericTagID = Number(tagID);
    if (!Number.isInteger(numericTagID)) {
      this.#setSpecies(null);
      return;
    }

    const species = this.#speciesData.find((entry) =>
      Array.isArray(entry.tag_ids) &&
      entry.tag_ids.some((configuredTagID) => Number(configuredTagID) === numericTagID),
    );

    this.#setSpecies(species ?? null);
  }

  #setSpecies(species) {
    if (species !== this.#species && this.#dialog?.open) {
      this.#closeDialog();
    }

    this.#species = species;
    const imageURL = species?.thumbnail_url || species?.image_url;
    if (!imageURL) {
      this.#image.removeAttribute("src");
      this.#button.hidden = true;
      this.hidden = true;
      return;
    }

    this.#button.setAttribute(
      "aria-label",
      `View ${species.name || "species"} details and examples`,
    );
    if (this.#image.getAttribute("src") !== imageURL) {
      this.#image.setAttribute("src", imageURL);
    }
    this.#button.hidden = false;
    this.hidden = false;
  }

  #handleImageError() {
    const fallbackURL = this.#species?.image_url;
    if (fallbackURL && this.#image.getAttribute("src") !== fallbackURL) {
      this.#image.setAttribute("src", fallbackURL);
      return;
    }

    console.error(`Failed to load species image: ${this.#image.src}`);
    this.#image.removeAttribute("src");
    this.#button.hidden = true;
    this.hidden = true;
  }

  #openDialog() {
    if (!this.#species) {
      return;
    }

    this.#ensureDialog();
    this.#renderDialog();
    this.#dialog.showModal();
  }

  #ensureDialog() {
    if (this.#dialog) {
      return;
    }

    const dialog = document.createElement("dialog");
    dialog.className = "a2otour-species-dialog";
    dialog.setAttribute("aria-labelledby", `${this.#dialogID}-title`);

    const card = document.createElement("article");
    card.className = "species-verification-example-card";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "a2otour-species-dialog-close";
    closeButton.setAttribute("aria-label", "Close species details");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", () => this.#closeDialog());

    const info = document.createElement("div");
    info.className = "site-info";

    const visual = document.createElement("div");
    visual.className = "site-info-visual";

    this.#largeImage = document.createElement("img");
    this.#largeImage.className = "site-info-image";
    this.#largeImage.alt = "";
    this.#largeImage.addEventListener("error", () => {
      console.error(`Failed to load species image: ${this.#largeImage.src}`);
      this.#largeImage.hidden = true;
    });

    this.#title = document.createElement("h2");
    this.#title.className = "site-info-title";
    this.#title.id = `${this.#dialogID}-title`;

    visual.append(this.#largeImage, this.#title);

    const content = document.createElement("div");
    content.className = "site-info-content";

    this.#description = document.createElement("p");
    this.#description.className = "site-info-text";

    this.#examples = document.createElement("div");
    this.#examples.className = "a2otour-species-examples";

    content.append(this.#description, this.#examples);
    info.append(visual, content);
    card.append(closeButton, info);
    dialog.append(card);
    dialog.addEventListener("cancel", () => this.#clearExamples());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        this.#closeDialog();
      }
    });

    document.body.append(dialog);
    this.#dialog = dialog;
  }

  #renderDialog() {
    const species = this.#species;
    this.#title.textContent = species.name || "Species";
    this.#description.textContent = species.description || "";
    this.#description.hidden = !species.description;

    const imageURL = species.image_url || species.thumbnail_url;
    this.#largeImage.hidden = !imageURL;
    if (imageURL && this.#largeImage.getAttribute("src") !== imageURL) {
      this.#largeImage.setAttribute("src", imageURL);
    }

    this.#clearExamples();
    if (!Array.isArray(species.examples)) {
      return;
    }

    species.examples.forEach((example, index) => {
      const url = typeof example === "string" ? example : example?.url;
      if (typeof url !== "string" || !url) {
        return;
      }

      const label =
        typeof example === "object" && example?.label
          ? example.label
          : `Example ${index + 1}`;
      this.#examples.append(this.#createExample(url, label, index));
    });
  }

  #createExample(url, label, index) {
    const item = document.createElement("div");
    item.className = "a2otour-species-example-item";

    const exampleLabel = document.createElement("p");
    exampleLabel.className = "site-info-text a2otour-species-example-label";
    exampleLabel.textContent = label;

    const spectrogramContainer = document.createElement("div");
    spectrogramContainer.className = "site-info-spectrogram";

    const spectrogramID = `${this.#dialogID}-spectrogram-${index + 1}`;
    const spectrogram = document.createElement("oe-spectrogram");
    spectrogram.id = spectrogramID;
    spectrogram.className = "site-info-spectrogram-view";
    spectrogram.setAttribute("src", url);
    spectrogram.setAttribute("scaling", "stretch");
    spectrogram.setAttribute("color-map", "grayscale");
    spectrogram.setAttribute("window-size", "512");
    spectrogram.setAttribute("window-function", "hamming");
    spectrogram.setAttribute("brightness", "0.05");
    spectrogram.setAttribute("contrast", "1.05");

    const player = document.createElement("div");
    player.className = "site-info-spectrogram-player";

    const controls = document.createElement("oe-media-controls");
    controls.setAttribute("for", spectrogramID);
    controls.append(
      this.#createControlLabel("play-icon", "play-fill", "Play"),
      this.#createControlLabel("pause-icon", "pause-fill", "Pause"),
    );
    player.append(controls);
    spectrogramContainer.append(spectrogram, player);
    item.append(exampleLabel, spectrogramContainer);
    return item;
  }

  #createControlLabel(slot, iconName, text) {
    const label = document.createElement("span");
    label.slot = slot;
    label.className = "site-info-spectrogram-action";

    const icon = document.createElement("sl-icon");
    icon.setAttribute("name", iconName);
    label.append(icon, document.createTextNode(text));
    return label;
  }

  #clearExamples() {
    this.#examples?.replaceChildren();
  }

  #closeDialog() {
    if (this.#dialog?.open) {
      this.#dialog.close();
    }
    this.#clearExamples();
  }
}

if (!customElements.get("a2otour-species-example")) {
  customElements.define("a2otour-species-example", A2OTourSpeciesExample);
}
